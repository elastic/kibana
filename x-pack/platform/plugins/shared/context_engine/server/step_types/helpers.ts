/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/core/server';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { StepContext } from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { isIndexPattern, validateAiIndexId } from '../../common/ai_index_dest';
import type { KiLifecycleStatus } from '../../common/step_types/ki';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  AiIndexAlreadyExistsError,
  AiIndexManagedError,
  AiIndexNotFoundError,
} from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { REVISION_TIE_WINDOW, kiIdQuery, pickCurrentRevision } from '../ai_indices/ki_get';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { KiVerificationSummary } from '../ki_verification';
import { WORKFLOW_VERIFIER_ID_PREFIX } from '../ki_verification';
import type { ContextEngineAnalyticsService, KiWriteAction } from '../telemetry';
import { errorTypeForTelemetry, isAbortError } from '../telemetry';

/** Dependencies injected into the KI step definition factories. */
export interface KiStepDependencies {
  getAiIndexService: () => AiIndexService;
  /** Whether the Context Engine advanced setting is on in this space. */
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
  /** Whether the request has the Context Engine write API privilege in this space. */
  checkWritePrivilege: (request: KibanaRequest, spaceId: string) => Promise<boolean>;
  analyticsService: ContextEngineAnalyticsService;
  logger: Logger;
}

/** Dependencies injected into the feedback analysis step definition factories. */
export interface FeedbackAnalysisStepDependencies {
  getAiIndexService: () => AiIndexService;
  getImprovementsService: (
    esClient: ElasticsearchClient,
    spaceId: string
  ) => ImprovementsServiceApi;
  getAuditLogger: (request: KibanaRequest) => Promise<AuditLogger | undefined>;
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
  /** Whether the feedback loop advanced setting is on. */
  isFeedbackLoopEnabled: () => Promise<boolean>;
  checkWritePrivilege: (request: KibanaRequest, spaceId: string) => Promise<boolean>;
  logger: Logger;
}

/** The AI index attributes KI steps need: the write target and whether the index is managed. */
export interface ResolvedAiIndex {
  dest: AiIndexDest;
  managed: boolean;
}

/** A writer as recorded under `governance.provenance`. */
export interface KiWriter {
  uri: string;
  metadata: Record<string, string | number>;
}

/** A stored KI document. */
export interface StoredKi {
  id?: string;
  governance?: {
    provenance?: { created_by?: KiWriter; updated_by?: KiWriter };
    lifecycle?: { status?: KiLifecycleStatus };
  };
  [key: string]: unknown;
}

/** The current revision of a KI. */
export interface KiRevision {
  index: string;
  documentId: string;
  seqNo?: number;
  primaryTerm?: number;
  source: StoredKi;
}

/** The workflow executing the step, as recorded in provenance. */
export const kiWriterFromContext = ({ workflow, execution }: StepContext): KiWriter => ({
  uri: `workflow://${workflow.id}`,
  metadata: {
    ...(workflow.version !== undefined && { version: workflow.version }),
    run_id: execution.id,
    space_id: workflow.spaceId,
  },
});

/** Fields stamped on every revision a step writes. */
export interface KiRevisionChanges {
  updated_at: string;
  governance: {
    provenance: { updated_by: KiWriter };
    lifecycle?: { status: KiLifecycleStatus };
  };
  [key: string]: unknown;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Merges like the update API's `doc`: objects merge, other values are replaced. */
export const mergeKiDoc = (
  source: Record<string, unknown>,
  changes: Record<string, unknown>
): Record<string, unknown> => {
  const merged = { ...source };
  for (const [key, value] of Object.entries(changes)) {
    const current = merged[key];
    merged[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeKiDoc(current, value) : value;
  }
  return merged;
};

/** Appends a new revision of a KI to a data stream. */
export const appendKiRevision = async ({
  esClient,
  destValue,
  kiId,
  source,
  changes,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  destValue: string;
  kiId: string;
  source: StoredKi;
  changes: KiRevisionChanges;
  abortSignal: AbortSignal;
}): Promise<void> => {
  await esClient.index(
    {
      index: destValue,
      document: {
        ...mergeKiDoc(source, changes),
        '@timestamp': changes.updated_at,
        id: source.id ?? kiId,
      },
      op_type: 'create',
      refresh: 'wait_for',
    },
    { signal: abortSignal }
  );
};

const KI_WRITE_SUCCESS_VERB: Record<KiWriteAction, string> = {
  create: 'created in',
  update: 'updated in',
  delete: 'deleted from',
};

/**
 * Runs a KI write step body, reporting the outcome (success, failure, or
 * aborted) to EBT and the logs. The body receives a callback to record the
 * AI index's managed state once resolved, and returns the step output whose
 * `id` is the KI id.
 */
export const withKiWriteTelemetry = async <Output extends { id: string }>({
  action,
  aiIndexId,
  analyticsService,
  logger,
  run,
}: {
  action: KiWriteAction;
  aiIndexId: string;
  analyticsService: ContextEngineAnalyticsService;
  logger: Logger;
  run: (setManaged: (managed: boolean) => void) => Promise<{ output: Output }>;
}): Promise<{ output: Output }> => {
  let managed: boolean | undefined;
  try {
    const result = await run((resolvedManaged) => {
      managed = resolvedManaged;
    });
    analyticsService.reportKiWrite({ action, aiIndexId, managed, outcome: 'success' });
    logger.debug(
      `KI '${result.output.id}' ${KI_WRITE_SUCCESS_VERB[action]} AI index '${aiIndexId}'`
    );
    return result;
  } catch (error) {
    // A cancelled run is not a write failure; report it as aborted.
    const aborted = isAbortError(error);
    const errorType = aborted ? undefined : errorTypeForTelemetry(error);
    analyticsService.reportKiWrite({
      action,
      aiIndexId,
      managed,
      outcome: aborted ? 'aborted' : 'failure',
      errorType,
    });
    logger.debug(
      aborted
        ? `KI ${action} aborted in AI index '${aiIndexId}'`
        : `KI ${action} failed in AI index '${aiIndexId}': ${errorType}`
    );
    throw error;
  }
};

/**
 * Runs the verify step body, reporting the outcome (success, failure, or
 * aborted) to EBT and the logs.
 */
export const withKiVerificationTelemetry = async ({
  analyticsService,
  logger,
  workflowId,
  aiIndexId,
  run,
}: {
  analyticsService: ContextEngineAnalyticsService;
  logger: Logger;
  workflowId: string;
  aiIndexId?: string;
  run: () => Promise<KiVerificationSummary>;
}): Promise<KiVerificationSummary> => {
  try {
    const summary = await run();
    const failures = summary.results.filter((result) => !result.passed);
    const failedWorkflowVerifierCount = failures.filter(({ verifier }) =>
      verifier.startsWith(WORKFLOW_VERIFIER_ID_PREFIX)
    ).length;
    analyticsService.reportKiVerification({
      outcome: 'success',
      passed: summary.passed,
      verifiersRun: summary.results.length,
      failedVerifierIds: [...new Set(failures.map(({ verifier }) => verifier))],
      failedWorkflowVerifierCount,
      workflowId,
      aiIndexId,
    });
    if (summary.passed) {
      logger.debug(`KI verification passed (verifiers run: ${summary.results.length})`);
    } else {
      logger.debug(
        `KI verification failed: ${failures.map(({ verifier }) => verifier).join(', ')}`
      );
    }
    return summary;
  } catch (error) {
    const aborted = isAbortError(error);
    const errorType = aborted ? undefined : errorTypeForTelemetry(error);
    analyticsService.reportKiVerification({
      outcome: aborted ? 'aborted' : 'failure',
      workflowId,
      errorType,
    });
    logger.debug(aborted ? 'KI verification aborted' : `KI verification errored: ${errorType}`);
    throw error;
  }
};

/** Fails the step when the workflow user lacks the Context Engine write API privilege. */
export const assertKiWritePrivilege = async (
  checkWritePrivilege: (request: KibanaRequest, spaceId: string) => Promise<boolean>,
  request: KibanaRequest,
  spaceId: string
): Promise<void> => {
  if (!(await checkWritePrivilege(request, spaceId))) {
    throw new ExecutionError({
      type: 'PermissionError',
      message: 'Insufficient privileges to modify knowledge indicators in AI indices',
    });
  }
};

/** Fails the step when the Context Engine setting is off in this space. */
export const assertContextEngineEnabled = async (
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>,
  spaceId: string
): Promise<void> => {
  if (!(await isContextEngineEnabled(spaceId))) {
    throw new ExecutionError({
      type: 'FeatureDisabledError',
      message: `Context Engine is disabled. Enable the '${CONTEXT_ENGINE_ENABLED_SETTING_ID}' advanced setting to use this step.`,
    });
  }
};

/** Fails the step when the feedback loop advanced setting is off. */
export const assertFeedbackLoopEnabled = async (
  isFeedbackLoopEnabled: () => Promise<boolean>
): Promise<void> => {
  if (!(await isFeedbackLoopEnabled())) {
    throw new ExecutionError({
      type: 'FeatureDisabledError',
      message:
        'The Context Engine feedback loop is disabled. Enable it in advanced settings to use this step.',
    });
  }
};

/** Resolves an AI index id to its backing store, failing the step when the id is unknown. */
export const resolveAiIndex = async (
  getAiIndexService: () => AiIndexService,
  aiIndexId: string,
  spaceId: string
): Promise<ResolvedAiIndex> => {
  try {
    const { dest, managed } = await getAiIndexService().get(aiIndexId, spaceId);
    return { dest, managed };
  } catch (error) {
    if (error instanceof AiIndexNotFoundError) {
      throw new ExecutionError({
        type: 'NotFoundError',
        message: `AI index '${aiIndexId}' not found`,
      });
    }
    throw error;
  }
};

/**
 * Resolves an AI index id to its backing store, lazily creating the AI index
 * when it does not exist yet with the index dest derived from the id (the UI
 * create flow's default).
 */
export const resolveOrCreateAiIndex = async (
  getAiIndexService: () => AiIndexService,
  aiIndexId: string,
  spaceId: string
): Promise<ResolvedAiIndex> => {
  const service = getAiIndexService();

  try {
    const { dest, managed } = await service.get(aiIndexId, spaceId);
    return { dest, managed };
  } catch (error) {
    if (!(error instanceof AiIndexNotFoundError)) {
      throw error;
    }
  }

  const { dest, error: idError } = validateAiIndexId('index', aiIndexId);
  if (idError !== undefined || dest === undefined) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: `Cannot create AI index '${aiIndexId}': ${idError}`,
    });
  }

  try {
    await service.create(aiIndexId, spaceId, {
      dest,
      automations: [],
      sources: [],
      traces: [],
    });
  } catch (error) {
    if (error instanceof AiIndexAlreadyExistsError) {
      // Lost a concurrent creation race; the AI index exists now.
      const { dest: existingDest, managed } = await service.get(aiIndexId, spaceId);
      return { dest: existingDest, managed };
    }
    if (error instanceof AiIndexManagedError) {
      throw new ExecutionError({
        type: 'ValidationError',
        message: `Cannot create AI index '${aiIndexId}': this id is reserved for a managed AI index`,
      });
    }
    throw error;
  }

  return { dest, managed: false };
};

/** Fails the step when the dest is an index pattern, which cannot be a write target. */
export const assertWritableDest = (aiIndexId: string, dest: AiIndexDest): void => {
  if (isIndexPattern(dest.value)) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: `Cannot create a KI in AI index '${aiIndexId}': its dest is an index pattern, not a single write target`,
    });
  }
};

/** The typed error for a KI that does not exist in the given AI index. */
export const kiNotFoundError = (aiIndexId: string, kiId: string): ExecutionError =>
  new ExecutionError({
    type: 'NotFoundError',
    message: `KI '${kiId}' not found in AI index '${aiIndexId}'`,
  });

export const isKiDeleted = (source: StoredKi): boolean =>
  source.governance?.lifecycle?.status === 'deleted';

/** The typed error for an update to a KI whose lifecycle status is deleted. */
export const kiDeletedError = (aiIndexId: string, kiId: string): ExecutionError =>
  new ExecutionError({
    type: 'ConflictError',
    message: `KI '${kiId}' in AI index '${aiIndexId}' has lifecycle status deleted; pass force: true to update it`,
  });

/** The typed error for a write that lost an optimistic concurrency check. */
export const kiConflictError = (aiIndexId: string, kiId: string): ExecutionError =>
  new ExecutionError({
    type: 'ConflictError',
    message: `KI '${kiId}' in AI index '${aiIndexId}' was modified concurrently`,
  });

/** Finds the current revision of a KI. */
export const findKiRevision = async ({
  esClient,
  aiIndexId,
  dest,
  kiId,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  kiId: string;
  abortSignal: AbortSignal;
}): Promise<KiRevision | undefined> => {
  const isDataStream = dest.type === 'data_stream';
  // A dest with no physical backing index yet must resolve to empty hits, not an error.
  const response = await esClient.search<StoredKi>(
    {
      index: dest.value,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: kiIdQuery(kiId),
      ...(isDataStream && {
        sort: [{ '@timestamp': { order: 'desc' as const, unmapped_type: 'date' as const } }],
      }),
      size: isDataStream ? REVISION_TIE_WINDOW : 2,
      seq_no_primary_term: true,
      _source: isDataStream ? true : ['id', 'governance'],
    },
    { signal: abortSignal }
  );

  const { hits } = response.hits;
  // An index-pattern dest can hold the same _id in multiple indices; refuse to pick one arbitrarily.
  if (!isDataStream && hits.length > 1) {
    const indices = hits.flatMap((hit) => (hit._index ? [hit._index] : []));
    throw new ExecutionError({
      type: 'ValidationError',
      message: `KI '${kiId}' is ambiguous in AI index '${aiIndexId}': it exists in multiple backing indices`,
      details: { indices },
    });
  }

  const hit = isDataStream ? pickCurrentRevision(hits) : hits[0];
  if (!hit?._index) {
    return undefined;
  }
  return {
    index: hit._index,
    documentId: hit._id ?? kiId,
    seqNo: hit._seq_no,
    primaryTerm: hit._primary_term,
    source: hit._source ?? {},
  };
};
