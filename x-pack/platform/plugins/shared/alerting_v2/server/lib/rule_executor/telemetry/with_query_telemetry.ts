/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { emitEvent } from '../events';
import type { QueryExecutedEvent } from '../events';
import type { RuleExecutionInput } from '../types';

/**
 * Subset of {@link RuleExecutionInput} the telemetry helpers need. Steps
 * already hold the full input so call sites stay short:
 *   `withQueryTelemetry(state.input, this.name, () => ...)`
 */
export type TelemetryInput = Pick<RuleExecutionInput, 'executionContext' | 'executionUuid'>;

/**
 * Wraps a single ES|QL call so the matching `query_executed` event fires
 * exactly once on success — and never fires on failure (the call rejects,
 * the helper rethrows, the terminal `execution_failed` event in the task
 * runner is the source of truth for the outcome).
 *
 * Use this helper instead of calling `QueryService.executeQuery` directly
 * from a step, so the telemetry contract is satisfied by composition
 * rather than by every step author remembering to emit.
 *
 * @example
 *   const response = await withQueryTelemetry(input, this.name, () =>
 *     this.queryService.executeQuery({ query, filter, params, abortSignal })
 *   );
 */
export const withQueryTelemetry = async (
  input: TelemetryInput,
  step: string,
  call: () => Promise<EsqlQueryResponse>
): Promise<EsqlQueryResponse> => {
  const startedAt = Date.now();
  const response = await call();
  const durationMs = Date.now() - startedAt;

  emitEvent<QueryExecutedEvent>(input.executionContext, input.executionUuid, {
    kind: 'query_executed',
    step,
    esTookMs: typeof response.took === 'number' ? response.took : durationMs,
    durationMs,
    rowCount: response.values?.length ?? 0,
  });

  return response;
};
