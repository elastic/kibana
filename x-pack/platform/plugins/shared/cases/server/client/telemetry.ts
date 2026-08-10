/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientArgs } from './types';

export function wrapTelemetry<TArgs extends unknown[], TReturn>(
  counter: string,
  clientArgs: CasesClientArgs,
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  const requestSource = clientArgs.requestSource ? clientArgs.requestSource : 'unknown';
  return (...args: TArgs) => {
    clientArgs.usageCounter?.incrementCounter({
      counterName: counter,
      counterType: `cases_client.${requestSource}`,
    });
    return fn(...args);
  };
}
