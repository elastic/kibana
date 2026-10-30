/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { TaskRunnerPocConfig } from './config';

export class TaskRunnerPocPlugin implements Plugin<void, void> {
  private readonly config: TaskRunnerPocConfig;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext<TaskRunnerPocConfig>) {
    this.config = initializerContext.config.get();
    this.logger = initializerContext.logger.get();
  }

  public setup(_core: CoreSetup) {
    const { serviceUrl, projectId, sharedSecret } = this.config;
    this.logger.info(
      `Task runner service ${serviceUrl}, project ${projectId}${
        sharedSecret ? '' : ' (sharedSecret is not set; service calls will fail)'
      }`
    );
  }

  public start() {}

  public stop() {}
}
