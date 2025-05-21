/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunnerFactoryDeps } from './types';
import type { CreateScopedRunnerExtraParams, RunnerFactory } from './types';
import { createScopedRunner as createScopedRunnerInternal, createRunner } from './runner';

export class RunnerFactoryImpl implements RunnerFactory {
  private readonly deps: RunnerFactoryDeps;

  constructor(deps: RunnerFactoryDeps) {
    this.deps = deps;
  }

  getRunner() {
    return createRunner(this.deps);
  }

  createScopedRunner(scopedParams: CreateScopedRunnerExtraParams) {
    return createScopedRunnerInternal({
      ...this.deps,
      ...scopedParams,
    });
  }
}
