/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientArgs } from './types';

export const withUsageCounter = <TArgs extends unknown[], TReturn>(
  counterName: string,
  { usageCounter, clientSource }: CasesClientArgs,
  fn: (...args: TArgs) => TReturn
): ((...args: TArgs) => TReturn) => {
  return (...args: TArgs) => {
    usageCounter?.incrementCounter({
      counterName,
      counterType: `cases_client.${clientSource}`,
    });
    return fn(...args);
  };
};
