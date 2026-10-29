/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidTraceId } from '@opentelemetry/api';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { EvaluationSubject, EvaluateResponse, Model } from '@kbn/evals-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { isResponseError } from '@kbn/es-errors';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import { mapWithConcurrency } from '@kbn/evals-runner';
import { withEvaluatorNameBaggage } from '../evaluators/evaluator_tracing_context';
import { formatEvidenceSchemaIssues } from '../evaluators/evidence/schema_issues';
import { createTraceAccessor, type TraceAccessorWithSearch } from '../evaluators/trace_accessor';
import { awaitTraceReady, TraceReadinessError } from '../evaluators/trace_readiness';
import type { EvidenceRound } from '../evaluators/evidence/types';
import type { EvaluatorDefinition, TraceAccessor } from '../evaluators/types';
import { resolveConnectorModel } from '../lib/resolve_connector_model';
import { EvaluationExecutionError } from './evaluation_execution_error';

/** Max evaluators graded in parallel for one trace; bounds concurrent judge-model calls. */
export const EVALUATOR_CONCURRENCY = 4;

export interface ResolvedEvaluator {
  definition: EvaluatorDefinition;
  connectorId?: string;
}

/** A round the caller already holds, graded as is. */
export interface InMemoryEvidence {
  round: EvidenceRound;
  referenceData?: Record<string, unknown>;
}

/**
 * Checks `reference_data` against each evaluator's schema, so a mismatch is refused before any
 * evaluator runs. Evaluators without a schema get it as passed.
 */
const parseReferenceData = (
  evaluators: ResolvedEvaluator[],
  referenceData: Record<string, unknown> | undefined
): Map<EvaluatorDefinition, Record<string, unknown> | undefined> => {
  const parsedByDefinition = new Map<EvaluatorDefinition, Record<string, unknown> | undefined>();
  for (const { definition } of evaluators) {
    if (!definition.referenceDataSchema) {
      parsedByDefinition.set(definition, referenceData);
      continue;
    }

    const parsed = definition.referenceDataSchema.safeParse(referenceData);
    if (!parsed.success) {
      throw new EvaluationExecutionError(
        `Invalid reference_data for evaluator "${definition.name}": ${z.prettifyError(
          parsed.error
        )}`,
        'badRequest'
      );
    }
    parsedByDefinition.set(definition, parsed.data as Record<string, unknown>);
  }
  return parsedByDefinition;
};

interface ExecuteEvaluatorsBaseOptions {
  /** Binds the judge's inference client and resolves its connector's model. */
  request: KibanaRequest;
  evaluators: ResolvedEvaluator[];
  logger: Logger;
  getInferenceStart?: () => Promise<InferenceServerStart>;
}

/** Grades the round reconstructed from a trace, once the trace has finished exporting. */
interface TraceSubjectOptions extends ExecuteEvaluatorsBaseOptions {
  subject: EvaluationSubject;
  /**
   * Identity the trace and log documents are read under. Callers that let the requester
   * choose both the trace and the prompt must pass `asCurrentUser`, because the judge's
   * explanation can quote back whatever it was shown.
   */
  traceReader: ElasticsearchClient;
  evidence?: never;
}

/** Grades in-memory evidence. No trace is read, so evaluators that need one fail. */
interface InMemoryEvidenceOptions extends ExecuteEvaluatorsBaseOptions {
  evidence: InMemoryEvidence;
  subject?: never;
  traceReader?: never;
}

export type ExecuteEvaluatorsOptions = TraceSubjectOptions | InMemoryEvidenceOptions;

const readRoundFromTrace = async ({
  traceAccessor,
  subject,
  logger,
}: {
  traceAccessor: TraceAccessorWithSearch;
  subject: EvaluationSubject;
  logger: Logger;
}): Promise<EvidenceRound> => {
  const profile = subject.instrumentation?.profile ?? 'elastic-inference';
  try {
    const { round } = await awaitTraceReady(traceAccessor, { mode: 'complete', profile }, logger);
    return round;
  } catch (error) {
    if (error instanceof TraceReadinessError) {
      throw new EvaluationExecutionError(error.message, 'notFound');
    }
    if (isResponseError(error) && error.statusCode === 403) {
      throw new EvaluationExecutionError(
        'Insufficient Elasticsearch privileges to read the trace. Grant read access to traces-* and logs-*.',
        'forbidden'
      );
    }
    throw error;
  }
};

export const executeEvaluators = async (
  options: ExecuteEvaluatorsOptions
): Promise<EvaluateResponse['results']> => {
  const { request, evaluators, logger, getInferenceStart } = options;
  if (options.subject?.mode === 'multi-turn') {
    throw new EvaluationExecutionError('multi-turn evaluation is not yet supported', 'badRequest');
  }

  for (const { definition, connectorId } of evaluators) {
    if (definition.kind === 'llm' && !connectorId) {
      throw new EvaluationExecutionError(
        `connector_id is required for llm evaluator "${definition.name}"`,
        'badRequest'
      );
    }
  }

  let referenceData: Record<string, unknown> | undefined;
  // Deferred so every input is validated before a trace is polled, which can take seconds.
  let readRound: () => Promise<{ round: EvidenceRound; traceAccessor?: TraceAccessor }>;
  if (options.evidence) {
    const { round } = options.evidence;
    ({ referenceData } = options.evidence);
    readRound = async () => ({ round });
  } else {
    const { subject, traceReader } = options;
    const [{ trace_id: traceId, reference_data: traceReferenceData }] = subject.traces;
    if (!isValidTraceId(traceId)) {
      throw new EvaluationExecutionError(
        'Invalid trace_id: must be a 32-character hex string',
        'badRequest'
      );
    }
    referenceData = traceReferenceData;
    const traceAccessor = createTraceAccessor({ traceId, esClient: traceReader });
    readRound = async () => ({
      round: await readRoundFromTrace({ traceAccessor, subject, logger }),
      traceAccessor,
    });
  }

  const parsedReferenceData = parseReferenceData(evaluators, referenceData);

  const { round, traceAccessor } = await readRound();

  let inferenceStartPromise: Promise<InferenceServerStart> | undefined;
  const getInference = (): Promise<InferenceServerStart> | undefined => {
    if (!getInferenceStart) {
      logger.error('Inference start contract is not configured');
      return undefined;
    }
    inferenceStartPromise ??= getInferenceStart();
    return inferenceStartPromise;
  };

  // Promises are cached so concurrent evaluators sharing a connector share one client.
  const inferenceClientByConnectorId = new Map<string, Promise<BoundInferenceClient>>();
  const getInferenceClient = (connectorId: string): Promise<BoundInferenceClient> | undefined => {
    const cachedClient = inferenceClientByConnectorId.get(connectorId);
    if (cachedClient) {
      return cachedClient;
    }

    const inferencePromise = getInference();
    if (!inferencePromise) {
      return undefined;
    }

    const inferenceClient = inferencePromise.then((inference) =>
      inference.getClient({ request, bindTo: { connectorId } })
    );
    inferenceClientByConnectorId.set(connectorId, inferenceClient);
    return inferenceClient;
  };

  const modelByConnectorId = new Map<string, Promise<Model | undefined>>();
  const getModel = (connectorId: string): Promise<Model | undefined> | undefined => {
    const cachedModel = modelByConnectorId.get(connectorId);
    if (cachedModel) {
      return cachedModel;
    }

    const inferencePromise = getInference();
    if (!inferencePromise) {
      return undefined;
    }

    const model = inferencePromise.then((inference) =>
      resolveConnectorModel({ connectorId, inference, request, logger })
    );
    modelByConnectorId.set(connectorId, model);
    return model;
  };

  const describeEvaluator = async (
    definition: EvaluatorDefinition,
    connectorId?: string
  ): Promise<EvaluateResponse['results'][number]['evaluator']> => {
    const base = {
      name: definition.name,
      version: definition.version,
      kind: definition.kind,
      direction: definition.direction,
    };
    if (definition.kind !== 'llm' || !connectorId) {
      return base;
    }
    const model = await getModel(connectorId);
    return model ? { ...base, model } : base;
  };

  const runEvaluator = async ({
    definition,
    connectorId,
  }: ResolvedEvaluator): Promise<EvaluateResponse['results'][number]> => {
    if (definition.evidenceSchema) {
      const evidenceParsed = definition.evidenceSchema.safeParse(round);
      if (!evidenceParsed.success) {
        return {
          status: 'error',
          evaluator: await describeEvaluator(definition, connectorId),
          error: {
            code: 'evidence_unmet',
            message: `Evaluator evidence requirements not met: ${formatEvidenceSchemaIssues(
              evidenceParsed.error
            )}`,
          },
        };
      }
    }

    try {
      const inferenceClient =
        definition.kind === 'llm' && connectorId
          ? await getInferenceClient(connectorId)
          : undefined;
      const result = await withEvaluatorNameBaggage(definition.name, () =>
        definition.evaluate({
          trace: traceAccessor,
          round,
          referenceData: parsedReferenceData.get(definition),
          inferenceClient,
          log: logger,
        })
      );

      return {
        status: 'ok',
        evaluator: await describeEvaluator(definition, connectorId),
        scores: result.scores,
      };
    } catch (error) {
      const errorDetail = error instanceof Error ? error.stack ?? error.message : String(error);
      logger.error(`Failed to execute evaluator "${definition.name}": ${errorDetail}`);
      return {
        status: 'error',
        evaluator: await describeEvaluator(definition, connectorId),
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  };

  return mapWithConcurrency(evaluators, runEvaluator, { concurrency: EVALUATOR_CONCURRENCY });
};
