/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidSpanId } from '@opentelemetry/api';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS,
  EVALS_EVENTS_LOGS_INDEX_PATTERN,
  GEN_AI_EVALUATION_RESULT_EVENT,
  type EvaluateEmission,
  type EvaluateEmitOptions,
  type EvaluateResult,
} from '@kbn/evals-common';
import type { Logger } from '@kbn/logging';
import { createTraceAccessor, type TraceFilter } from '../evaluators/trace_accessor';
import type { EvaluationEventsEmitter } from './evaluation_events_emitter';

// Bounded by the evaluate route's 20-evaluator cap times a generous scores-per-evaluator margin.
const EMITTED_EVENTS_SEARCH_SIZE = 1000;

interface EvaluationEventDocument {
  attributes?: Record<string, unknown>;
}

/** Identifies an evaluator version in `EvaluateEmission.skipped_evaluators`. */
export const toEvaluatorKey = (name: string, version: string): string => `${name}@${version}`;

export class EvaluationEmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationEmissionError';
  }
}

/**
 * Returns the evaluators (as `name@version` keys) that already emitted evaluation events for
 * this monitor and trace. Uses Query DSL so unmapped `attributes.*` fields match nothing.
 */
export const findEmittedEvaluators = async ({
  esClient,
  logger,
  spaceId,
  monitorId,
  traceId,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  monitorId: string;
  traceId: string;
}): Promise<Set<string>> => {
  const response = await esClient.search<EvaluationEventDocument>({
    index: EVALS_EVENTS_LOGS_INDEX_PATTERN,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: EMITTED_EVENTS_SEARCH_SIZE,
    track_total_hits: EMITTED_EVENTS_SEARCH_SIZE + 1,
    _source: [
      `attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_NAME}`,
      `attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_VERSION}`,
    ],
    query: {
      bool: {
        filter: [
          { term: { event_name: GEN_AI_EVALUATION_RESULT_EVENT } },
          { term: { trace_id: traceId } },
          {
            term: { [`attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.MONITOR_ID}`]: monitorId },
          },
          { term: { [`attributes.${EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.SPACE_ID}`]: spaceId } },
        ],
      },
    },
  });

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value;
  if (total !== undefined && total > EMITTED_EVENTS_SEARCH_SIZE) {
    const message = `Too many evaluation events for trace ${traceId} to deduplicate evaluators`;
    logger.error(message);
    throw new EvaluationEmissionError(message);
  }

  return new Set(
    response.hits.hits.flatMap(({ _source: source }) => {
      const name = source?.attributes?.[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_NAME];
      const version = source?.attributes?.[EVALS_EVALUATION_EVENT_ATTRIBUTE_KEYS.EVALUATOR_VERSION];
      return typeof name === 'string' && typeof version === 'string'
        ? [toEvaluatorKey(name, version)]
        : [];
    })
  );
};

const readSpanId = (source: Record<string, unknown>): string | undefined => {
  const spanId = source.span_id ?? source['span.id'];
  return typeof spanId === 'string' && isValidSpanId(spanId) ? spanId : undefined;
};

const ROOT_SPAN_FILTERS: TraceFilter[][] = [
  [{ type: 'not_exists', field: 'parent_span_id' }],
  // Fall back to the earliest span when the root is missing from storage.
  [],
];

/** Resolves the span that evaluation events attach to: the trace's root span, else its earliest. */
export const findAnchorSpanId = async ({
  esClient,
  traceId,
}: {
  esClient: ElasticsearchClient;
  traceId: string;
}): Promise<string | undefined> => {
  const traceAccessor = createTraceAccessor({ traceId, esClient });

  for (const filter of ROOT_SPAN_FILTERS) {
    const { documents } = await traceAccessor.runSearch('traces', {
      filter,
      fields: ['span_id', 'span.id'],
      sort: { field: '@timestamp', order: 'asc' },
      size: 1,
    });
    const spanId = documents[0] ? readSpanId(documents[0].source) : undefined;
    if (spanId) {
      return spanId;
    }
  }

  return undefined;
};

/**
 * Emits successful scores as `gen_ai.evaluation.result` events attached to the evaluated trace.
 * Throws `EvaluationEmissionError` when the events could not be stored.
 */
export const emitEvaluationResults = async ({
  emitter,
  traceReader,
  logger,
  spaceId,
  traceId,
  emit,
  results,
  connectorIdByEvaluator,
  skippedEvaluators,
}: {
  emitter: EvaluationEventsEmitter;
  traceReader: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  traceId: string;
  emit: EvaluateEmitOptions;
  results: EvaluateResult[];
  connectorIdByEvaluator: ReadonlyMap<string, string>;
  skippedEvaluators: string[];
}): Promise<EvaluateEmission> => {
  const emittable = results.filter(
    ({ status, scores }) => status === 'ok' && scores !== undefined && scores.length > 0
  );
  if (emittable.length === 0) {
    return { emitted: 0, skipped_evaluators: skippedEvaluators };
  }

  try {
    const spanId = await findAnchorSpanId({ esClient: traceReader, traceId });
    if (!spanId) {
      throw new EvaluationEmissionError(
        `No span found in trace ${traceId} to attach evaluation events to`
      );
    }

    const { emitted } = await emitter.emit({
      spaceId,
      monitor: emit.monitor,
      traceId,
      spanId,
      connectorIdByEvaluator,
      results: emittable,
    });
    return { emitted, skipped_evaluators: skippedEvaluators };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to emit evaluation events for trace ${traceId}: ${message}`);
    throw new EvaluationEmissionError(message);
  }
};
