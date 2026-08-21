/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientArgs } from './types';

/**
 * Counters emitted from inside a case write operation, where the wrapper below cannot see whether a
 * template was involved. They count cases, not calls, and unlike the wrapper they only fire once the
 * write has succeeded — so they do not add up to `create_case` / `bulk_create_cases`.
 */
export const CREATE_CASE_WITH_TEMPLATE_COUNTER = 'create_case_with_template';
export const CREATE_CASE_WITHOUT_TEMPLATE_COUNTER = 'create_case_without_template';

type CasesClientCounterArgs = Pick<CasesClientArgs, 'usageCounter' | 'clientSource'>;

/**
 * Increments a cases client counter tagged with the calling source.
 *
 * `incrementCounter` already defaults `incrementBy` to 1, so it is omitted when unspecified to keep
 * the emitted payload identical to what the wrapper below has always produced. A non-positive count
 * emits nothing, so bulk callers can pass a computed bucket size unconditionally.
 */
export const incrementCasesClientCounter = (
  { usageCounter, clientSource }: CasesClientCounterArgs,
  counterName: string,
  incrementBy?: number
): void => {
  if (incrementBy != null && incrementBy <= 0) {
    return;
  }

  usageCounter?.incrementCounter({
    counterName,
    counterType: `cases_client.${clientSource}`,
    ...(incrementBy != null ? { incrementBy } : {}),
  });
};

export const withUsageCounter = <TArgs extends unknown[], TReturn>(
  counterName: string,
  clientArgs: CasesClientArgs,
  fn: (...args: TArgs) => TReturn
): ((...args: TArgs) => TReturn) => {
  return (...args: TArgs) => {
    incrementCasesClientCounter(clientArgs, counterName);
    return fn(...args);
  };
};
