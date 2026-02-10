/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { ExecutionContextSetup } from '@kbn/core/server';

type ExecutionFn<R> = (...args: unknown[]) => Promise<R>;

export type ExecutionContextRunner<R> = (
  fn: ExecutionFn<R>,
  context?: KibanaExecutionContext
) => Promise<R>;

// Return a function that will run the function argument with an execution context.
export function getExecutionContextRunner<R>(
  contextSetup: ExecutionContextSetup,
  baseContext: KibanaExecutionContext
): ExecutionContextRunner<R> {
  // make a shallow copy ...
  baseContext = { ...baseContext };

  async function executionContextRunner(
    fn: ExecutionFn<R>,
    context?: KibanaExecutionContext
  ): Promise<R> {
    // apply the contexts in order, always add type: "task manager"
    const finalContext = { ...context, ...baseContext, type: 'task manager' };
    return await contextSetup.withContext<Promise<R>>(finalContext, fn);
  }

  return executionContextRunner;
}
