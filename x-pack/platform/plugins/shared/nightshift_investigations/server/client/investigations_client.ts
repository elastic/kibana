/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import type {
  GetInvestigationResponse,
  InvestigationStatus,
  InvestigationSubject,
  InvestigationSubjectType,
  InvestigationTriggerType,
  ListInvestigationItem,
  ListInvestigationsRequest,
  ListInvestigationsResponse,
  UpdateInvestigationRequest,
  StartInvestigationRequest,
  StartInvestigationResponse,
} from '../../common';
import {
  DEFAULT_INVESTIGATION_TRIGGER_TYPE,
  INVESTIGATION_SUBJECT_TYPES,
  INVESTIGATION_TRIGGER_TYPES,
} from '../../common';
import type {
  InvestigationSavedObjectClient,
  InvestigationSavedObjectUpdateAttributes,
  NightshiftInvestigationAttributes,
} from '../saved_objects';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvestigationSubjectMissingError,
  InvestigationUnavailableError,
} from './errors';
export {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvestigationSubjectMissingError,
  InvestigationUnavailableError,
};

/** Used when persist omitted `error`, or when reconciling a failed workflow execution. */
const FALLBACK_INVESTIGATION_ERROR = 'Investigation failed';

const LIST_SO_FIELDS = [
  'completed_at',
  'concurrency_key',
  'created_at',
  'error',
  'executed_by',
  'status',
  'subject_id',
  'subject_summary',
  'subject_type',
  'summary',
  'trigger_type',
] as const satisfies ReadonlyArray<keyof NightshiftInvestigationAttributes>;

function toSubject({
  subjectType,
  subjectId,
  subjectSummary,
}: {
  subjectType: InvestigationSubjectType;
  subjectId: string;
  subjectSummary?: string;
}): InvestigationSubject {
  if (subjectSummary) {
    return { type: subjectType, id: subjectId, summary: subjectSummary };
  }
  return { type: subjectType, id: subjectId };
}

function toListInvestigationItem({
  id,
  attrs,
}: {
  id: string;
  attrs: NightshiftInvestigationAttributes;
}): ListInvestigationItem {
  return {
    investigation_id: id,
    subject: toSubject({
      subjectType: attrs.subject_type,
      subjectId: attrs.subject_id,
      subjectSummary: attrs.subject_summary,
    }),
    trigger_type: attrs.trigger_type,
    status: attrs.status,
    started_at: attrs.created_at,
    completed_at: attrs.completed_at,
    concurrency_key: attrs.concurrency_key,
    executed_by: attrs.executed_by,
    error: attrs.error,
    summary: attrs.summary,
  };
}

function toInvestigationResponse({
  id,
  attrs,
}: {
  id: string;
  attrs: NightshiftInvestigationAttributes;
}): GetInvestigationResponse {
  return {
    ...toListInvestigationItem({ id, attrs }),
    conclusion: attrs.conclusion,
    hypotheses: attrs.hypotheses,
    recommendations: attrs.recommendations,
    blind_spots: attrs.blind_spots,
    significant_event_updates: attrs.significant_event_updates,
    conversation_id: attrs.conversation_id,
    impact: attrs.impact,
  };
}

function toInvestigationStatus(status: ExecutionStatus, logger: Logger): InvestigationStatus {
  switch (status) {
    case ExecutionStatus.PENDING:
    case ExecutionStatus.QUEUED:
      return 'pending';
    case ExecutionStatus.RUNNING:
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
    case ExecutionStatus.WAITING_FOR_CHILD:
      return 'running';
    case ExecutionStatus.COMPLETED:
      return 'completed';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
      return 'failed';
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.SKIPPED:
      return 'cancelled';
    default: {
      // TypeScript will error here if a new ExecutionStatus value is added without a case above.
      const _exhaustiveCheck: never = status;
      logger.warn(
        `Unknown workflow ExecutionStatus "${_exhaustiveCheck}" for investigation, treating as running`
      );
      return 'running';
    }
  }
}

function isTerminalStatus(status: InvestigationStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSubjectType = (value: unknown): value is InvestigationSubjectType =>
  typeof value === 'string' && INVESTIGATION_SUBJECT_TYPES.some((type) => type === value);

const isTriggerType = (value: unknown): value is InvestigationTriggerType =>
  typeof value === 'string' && INVESTIGATION_TRIGGER_TYPES.some((type) => type === value);

interface ExecutionInvestigationMetadata {
  subject?: InvestigationSubject;
  triggerType: InvestigationTriggerType;
  concurrencyKey?: string;
}

/**
 * Extracts the investigation metadata that start() encodes into the workflow inputs
 * (see the `inputs` object built there) back out of a workflow execution document.
 */
function parseExecutionInvestigationMetadata(
  executionContext: Record<string, unknown> | undefined
): ExecutionInvestigationMetadata {
  const inputs =
    isRecord(executionContext) && isRecord(executionContext.inputs)
      ? executionContext.inputs
      : undefined;
  const inputContext = inputs && isRecord(inputs.context) ? inputs.context : undefined;

  const rawSource = inputContext?.source;
  let subject: InvestigationSubject | undefined;
  if (isSubjectType(rawSource)) {
    const rawSubjectId = inputContext?.[`${rawSource}_id`];
    if (typeof rawSubjectId === 'string' && rawSubjectId.length > 0) {
      const rawSummary = inputContext?.summary;
      const subjectSummary =
        typeof rawSummary === 'string' && rawSummary.length > 0 ? rawSummary : undefined;
      subject = toSubject({
        subjectType: rawSource,
        subjectId: rawSubjectId,
        subjectSummary,
      });
    }
  }

  const rawTriggerType = inputContext?.trigger_type;
  const triggerType = isTriggerType(rawTriggerType)
    ? rawTriggerType
    : DEFAULT_INVESTIGATION_TRIGGER_TYPE;

  const rawConcurrencyKey = inputs?.concurrency_key;
  const concurrencyKey = typeof rawConcurrencyKey === 'string' ? rawConcurrencyKey : undefined;

  return { subject, triggerType, concurrencyKey };
}

export interface NightshiftInvestigationsClientDeps {
  request: KibanaRequest;
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  logger: Logger;
  spaceIdOverride?: string;
  agentBuilder?: AgentBuilderPluginStart;
  investigationSoClient: PublicMethodsOf<InvestigationSavedObjectClient>;
}

export class NightshiftInvestigationsClient {
  private readonly request: KibanaRequest;
  private readonly workflowsManagement: WorkflowsServerPluginSetup | undefined;
  private readonly spaces: SpacesPluginStart | undefined;
  private readonly logger: Logger;
  private readonly spaceIdOverride?: string;
  private readonly agentBuilder?: AgentBuilderPluginStart;
  private readonly investigationSoClient: PublicMethodsOf<InvestigationSavedObjectClient>;

  constructor(deps: NightshiftInvestigationsClientDeps) {
    this.request = deps.request;
    this.workflowsManagement = deps.workflowsManagement;
    this.spaces = deps.spaces;
    this.logger = deps.logger;
    this.spaceIdOverride = deps.spaceIdOverride;
    this.agentBuilder = deps.agentBuilder;
    this.investigationSoClient = deps.investigationSoClient;
  }

  private getSpaceId(): string {
    return (
      this.spaceIdOverride ??
      this.spaces?.spacesService.getSpaceId(this.request) ??
      DEFAULT_SPACE_ID
    );
  }

  async start({
    subject,
    trigger_type,
    message,
    stream_names,
    concurrency_key,
    context,
  }: StartInvestigationRequest): Promise<StartInvestigationResponse> {
    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }

    if (!this.agentBuilder) {
      throw new InvestigationUnavailableError('agentBuilder is not available');
    }

    const spaceId = this.getSpaceId();

    // The `nightshift.ensureInvestigationAgent` workflow step is the general guarantee that the
    // agent exists wherever an investigation runs. This narrower install stays because the run
    // below executes the *stored* workflow definition, which predates that step until the managed
    // install has upgraded it — and that install is fire-and-forget. Deliberately without the
    // step's visibility retry: the workflow owns that, and this request path should not pay for it.
    await installInvestigationAgent({ agentBuilder: this.agentBuilder, spaceId });

    const workflow = await this.workflowsManagement.management.getWorkflow(
      SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
      spaceId
    );

    if (!workflow?.definition) {
      this.logger.error(
        `Investigation workflow "${SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID}" is not installed in space "${spaceId}"`
      );
      throw new InvestigationUnavailableError('Investigations are not configured in this space');
    }

    const inputs = {
      message: message ?? `Investigation requested for ${subject.type} ${subject.id}`,
      stream_names: stream_names ?? [],
      ...(concurrency_key ? { concurrency_key } : {}),
      context: {
        ...context,
        source: subject.type,
        [`${subject.type}_id`]: subject.id,
        trigger_type: trigger_type ?? DEFAULT_INVESTIGATION_TRIGGER_TYPE,
        ...(subject.summary ? { summary: subject.summary } : {}),
      },
    };

    const executionId = await this.workflowsManagement.management.runWorkflow(
      { ...workflow, definition: workflow.definition },
      spaceId,
      inputs,
      this.request,
      'nightshift-investigations'
    );

    this.logger.info(
      `Started investigation for ${subject.type}/${subject.id}, execution_id=${executionId}`
    );

    await this.ensureSavedObject(executionId).catch((error) => {
      this.logger.warn(
        `Failed to eagerly persist investigation "${executionId}", deferring to the workflow's ensure step: ${error.message}`
      );
    });

    return { investigation_id: executionId };
  }

  /**
   * Creates the saved object for a workflow execution if it does not exist yet.
   * Called from start() so the id is readable immediately, and by the workflow's
   * persist_investigation_started step so runs that skipped start() are still tracked. Idempotent so
   * replays and concurrent calls are safe.
   */
  async ensureSavedObject(investigationId: string): Promise<void> {
    const existing = await this.investigationSoClient.get(investigationId);
    if (existing) {
      return;
    }

    if (!this.workflowsManagement) {
      throw new InvestigationUnavailableError('workflowsManagement is not available');
    }

    const spaceId = this.getSpaceId();
    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      investigationId,
      spaceId,
      { includeOutput: false }
    );

    // Identity comes from the execution document, never from the request, so a caller cannot
    // mint investigation records out of nonexistent or unrelated workflow executions.
    const belongsToInvestigationWorkflow =
      execution?.workflowId === SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID ||
      execution?.originManagedWorkflowId === SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID;
    if (!execution || !belongsToInvestigationWorkflow) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const { subject, triggerType, concurrencyKey } = parseExecutionInvestigationMetadata(
      execution.context
    );

    // An investigation without a subject is meaningless to the API (entity filtering,
    // sig-event attachment, alert linkage all presume one), so fail the run loudly —
    // the step error in the workflow executions UI tells the caller what to pass.
    if (!subject) {
      throw new InvestigationSubjectMissingError(investigationId);
    }

    if (concurrencyKey) {
      await this.cancelSupersededInvestigation({ concurrency_key: concurrencyKey });
    }

    try {
      await this.investigationSoClient.create({
        id: investigationId,
        attributes: {
          investigation_id: investigationId,
          status: 'running',
          subject_type: subject.type,
          subject_id: subject.id,
          ...(subject.summary ? { subject_summary: subject.summary } : {}),
          trigger_type: triggerType,
          concurrency_key: concurrencyKey,
          executed_by: execution.executedBy,
          created_at: execution.startedAt ?? new Date().toISOString(),
        },
      });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        // A concurrent ensure created it first.
        return;
      }
      throw error;
    }
  }

  private async cancelSupersededInvestigation({
    concurrency_key,
  }: {
    concurrency_key: string;
  }): Promise<void> {
    const superseded = await this.investigationSoClient.findByConcurrencyKey(concurrency_key);

    if (!superseded || isTerminalStatus(superseded.attributes.status)) {
      return;
    }

    try {
      await this.investigationSoClient.update(
        superseded.id,
        {
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        },
        { version: superseded.version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        this.logger.warn(
          `Skipped cancelling superseded investigation "${superseded.id}": it was concurrently modified`
        );
        return;
      }
      throw error;
    }
  }

  async update(investigationId: string, state: UpdateInvestigationRequest): Promise<void> {
    const existing = await this.investigationSoClient.get(investigationId);
    if (!existing) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const { status, error, ...output } = state;

    if (isTerminalStatus(existing.attributes.status)) {
      // Replaying the same terminal status is an idempotent success — the workflow persist
      // steps retry when a response is lost. Anything else (a late progress report, a
      // superseded run's final persist) must not overwrite a settled record.
      if (status === existing.attributes.status) {
        return;
      }
      throw new InvestigationConflictError(investigationId, existing.attributes.status);
    }

    if (status === 'failed' && error) {
      this.logger.warn(`Investigation "${investigationId}" failed: ${error}`);
    }

    const attrs: InvestigationSavedObjectUpdateAttributes = {
      status,
      ...(isTerminalStatus(status) && { completed_at: new Date().toISOString() }),
      ...(status === 'failed' && { error: error ?? FALLBACK_INVESTIGATION_ERROR }),
      ...output,
    };

    await this.investigationSoClient.update(investigationId, attrs, {
      version: existing.version,
    });
  }

  async get(investigationId: string): Promise<GetInvestigationResponse> {
    const so = await this.investigationSoClient.get(investigationId);

    if (!so) {
      throw new InvestigationNotFoundError(investigationId);
    }

    const response = toInvestigationResponse({ id: investigationId, attrs: so.attributes });

    if (so.attributes.status === 'running') {
      const reconciled = await this.reconcileStaleRunningStatus(investigationId, so.version).catch(
        (err) => {
          this.logger.warn(
            `Failed to reconcile status for investigation "${investigationId}": ${err.message}`
          );
          return undefined;
        }
      );
      if (reconciled) {
        response.status = reconciled.status;
        response.completed_at = reconciled.completed_at;
        response.error = reconciled.error;
      }
    }

    return response;
  }

  private async reconcileStaleRunningStatus(
    investigationId: string,
    version: string | undefined
  ): Promise<{ status: InvestigationStatus; completed_at?: string; error?: string } | undefined> {
    if (!this.workflowsManagement) {
      return undefined;
    }

    const spaceId = this.getSpaceId();
    const execution = await this.workflowsManagement.management.getWorkflowExecution(
      investigationId,
      spaceId,
      { includeOutput: false }
    );

    if (!execution) {
      this.logger.warn(
        `Investigation "${investigationId}" is marked running but its workflow execution no longer exists; the status cannot be reconciled`
      );
      return undefined;
    }

    const workflowStatus = toInvestigationStatus(execution.status, this.logger);
    if (!isTerminalStatus(workflowStatus)) {
      return undefined;
    }

    const correction: InvestigationSavedObjectUpdateAttributes = {
      status: workflowStatus,
      completed_at: execution.finishedAt ?? new Date().toISOString(),
      ...(workflowStatus === 'failed' && { error: FALLBACK_INVESTIGATION_ERROR }),
    };

    if (workflowStatus === 'failed' && execution.error?.message) {
      this.logger.warn(`Investigation "${investigationId}" failed: ${execution.error.message}`);
    }

    await this.investigationSoClient
      .update(investigationId, correction, { version })
      .catch((err) => {
        this.logger.warn(
          `Failed to reconcile stale SO status for investigation "${investigationId}": ${err.message}`
        );
      });

    return {
      status: workflowStatus,
      completed_at: correction.completed_at,
      error: correction.error,
    };
  }

  async list({
    statuses,
    started_after,
    started_before,
    finished_after,
    finished_before,
    sort_field,
    sort_order,
    page = 1,
    size = 20,
  }: ListInvestigationsRequest = {}): Promise<ListInvestigationsResponse> {
    const result = await this.investigationSoClient.find({
      statuses,
      createdAfter: started_after,
      createdBefore: started_before,
      completedAfter: finished_after,
      completedBefore: finished_before,
      sortField: sort_field === 'finished_at' ? 'completed_at' : 'created_at',
      sortOrder: sort_order,
      page,
      perPage: size,
      fields: [...LIST_SO_FIELDS],
    });

    const results = result.results.map((so) =>
      toListInvestigationItem({ id: so.id, attrs: so.attributes })
    );

    // Cross-check `running` items against the workflow engine (same reconciliation as get(),
    // page-bounded) so list and get never disagree about a stale status. Failures fall back to
    // the raw SO status — the list must not fail just because the engine is unreachable.
    await Promise.all(
      result.results.map(async (so, index) => {
        if (so.attributes.status !== 'running') {
          return;
        }
        const item = results[index];
        const reconciled = await this.reconcileStaleRunningStatus(so.id, so.version).catch(
          (err) => {
            this.logger.warn(
              `Failed to reconcile status for investigation "${so.id}" in list: ${err.message}`
            );
            return undefined;
          }
        );
        if (reconciled) {
          item.status = reconciled.status;
          item.completed_at = reconciled.completed_at;
          item.error = reconciled.error;
        }
      })
    );

    return { results, page: result.page, size: result.size, total: result.total };
  }
}
