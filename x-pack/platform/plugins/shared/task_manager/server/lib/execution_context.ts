/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { ExecutionContextSetup } from '@kbn/core/server';

export interface CreateExecutionContextArgs {
  contextSetup: ExecutionContextSetup;
  baseContext: KibanaExecutionContext;
}

export interface ExecutionContextRunner {
  run<T>(fn: () => Promise<T>, context?: KibanaExecutionContext): Promise<T>;
}
export class ExecutionContextRunnerImpl implements ExecutionContextRunner {
  private contextSetup: ExecutionContextSetup;
  private baseContext: KibanaExecutionContext;

  constructor(args: CreateExecutionContextArgs) {
    this.contextSetup = args.contextSetup;
    this.baseContext = args.baseContext;
  }

  async run<T>(fn: () => Promise<T>, context: KibanaExecutionContext = {}): Promise<T> {
    // apply the contexts in order, always add type: "task manager"
    const finalContext = { ...context, ...this.baseContext, type: 'task manager' };
    return this.contextSetup.withContext(finalContext, fn);
  }
}

export function getExecutionContextRunner(
  contextSetup: ExecutionContextSetup,
  baseContext: KibanaExecutionContext = {}
): ExecutionContextRunner {
  return new ExecutionContextRunnerImpl({ contextSetup, baseContext });
}
