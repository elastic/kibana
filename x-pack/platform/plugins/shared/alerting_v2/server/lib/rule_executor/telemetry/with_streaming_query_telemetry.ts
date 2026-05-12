/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emitEvent } from '../events';
import type { BatchProcessedEvent, QueryExecutedEvent } from '../events';
import type { TelemetryInput } from './with_query_telemetry';

/**
 * Wraps a streaming ES|QL call (`QueryService.executeQueryStream`) so that:
 *  - one `batch_processed` event fires per batch yielded downstream, and
 *  - one summary `query_executed` event fires when the stream completes
 *    cleanly. If the stream throws (e.g. abort), no `query_executed` is
 *    emitted; partial `batch_processed` events emitted prior remain valid.
 *
 * The helper is shape-preserving: callers iterate the returned generator
 * exactly as they would the original stream.
 *
 * `esTookMs` is set to the wall-clock duration because ES `took` is not
 * surfaced for arrow streams.
 *
 * @example
 *   const stream = withStreamingQueryTelemetry(
 *     input,
 *     this.name,
 *     this.queryService.executeQueryStream({ query, filter, params, abortSignal })
 *   );
 *   for await (const batch of stream) {
 *     yield { type: 'continue', state: { ...state, esqlRowBatch: batch } };
 *   }
 */
export const withStreamingQueryTelemetry = async function* <T>(
  input: TelemetryInput,
  step: string,
  stream: AsyncIterable<readonly T[]>
): AsyncGenerator<readonly T[]> {
  const startedAt = Date.now();
  let rowCount = 0;

  for await (const batch of stream) {
    rowCount += batch.length;
    emitEvent<BatchProcessedEvent>(input.executionContext, input.executionUuid, {
      kind: 'batch_processed',
      step,
      rowCount: batch.length,
    });
    yield batch;
  }

  const durationMs = Date.now() - startedAt;
  emitEvent<QueryExecutedEvent>(input.executionContext, input.executionUuid, {
    kind: 'query_executed',
    step,
    esTookMs: durationMs,
    durationMs,
    rowCount,
  });
};
