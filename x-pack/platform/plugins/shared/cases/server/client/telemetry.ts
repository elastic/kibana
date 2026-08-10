/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientArgs } from './types';

export type CasesClientSource =
  | 'rest_api'
  | 'connector'
  | 'workflow'
  | 'agent_builder'
  | 'plugin_contract'
  | 'unknown';

export function withUsageCounter<TArgs extends unknown[], TReturn>(
  counterName: string,
  clientArgs: CasesClientArgs,
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const clientSource = clientArgs.clientSource ? clientArgs.clientSource : 'unknown';
  return (...args: TArgs) => {
    clientArgs.usageCounter?.incrementCounter({
      counterName,
      counterType: `cases_client.${clientSource}`,
    });
    return fn(...args);
  };
}
