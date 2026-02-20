/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunnerFactoryDeps } from './types';
import type { RunnerFactory } from './types';
import { createModelProviderFactory } from './model_provider';
import { createRunner, type CreateRunnerDeps } from './runner';

export class RunnerFactoryImpl implements RunnerFactory {
  private readonly deps: RunnerFactoryDeps;

  constructor(deps: RunnerFactoryDeps) {
    this.deps = deps;
  }

  getRunner() {
    return createRunner(this.createRunnerDeps());
  }

  private createRunnerDeps(): CreateRunnerDeps {
    const { inference, trackingService, uiSettings, hooks, savedObjects, ...otherDeps } = this.deps;
    return {
      ...otherDeps,
      savedObjects,
      uiSettings,
      trackingService,
      hooks,
      modelProviderFactory: createModelProviderFactory({
        inference,
        trackingService,
        uiSettings,
        savedObjects,
      }),
    };
  }
}
