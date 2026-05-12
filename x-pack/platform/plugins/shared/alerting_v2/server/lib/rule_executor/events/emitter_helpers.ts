/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionContext } from '../../execution_context';
import type { RuleExecutionEvent } from './types';

/**
 * Convenience helper: emit an event with `executionUuid` and `at` filled in
 * from the call site, so emitters at step/service level only specify the
 * domain-meaningful fields.
 *
 * @example
 *   emitEvent<BatchProcessedEvent>(ctx, executionUuid, {
 *     kind: 'batch_processed',
 *     step: 'execute_rule_query',
 *     rowCount: batch.length,
 *   });
 */
export const emitEvent = <E extends RuleExecutionEvent>(
  ctx: ExecutionContext,
  executionUuid: string,
  partial: Omit<E, 'executionUuid' | 'at'>
): void => {
  ctx.emit({ ...partial, executionUuid, at: new Date() } as unknown as E);
};
