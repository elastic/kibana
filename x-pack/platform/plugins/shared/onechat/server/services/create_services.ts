/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Runner } from '@kbn/onechat-server';
import type { InternalSetupServices, InternalStartServices, ServicesStartDeps } from './types';
import { ToolsService } from './tools';
import { RunnerFactoryImpl } from './runner';

interface ServiceInstances {
  tools: ToolsService;
}

export class ServiceManager {
  private services?: ServiceInstances;
  public internalSetup?: InternalSetupServices;
  public internalStart?: InternalStartServices;

  setupServices(): InternalSetupServices {
    this.services = {
      tools: new ToolsService(),
    };

    this.internalSetup = {
      tools: this.services.tools.setup(),
    };

    return this.internalSetup;
  }

  startServices({
    logger,
    security,
    elasticsearch,
    actions,
    inference,
  }: ServicesStartDeps): InternalStartServices {
    if (!this.services) {
      throw new Error('#startServices called before #setupServices');
    }

    // eslint-disable-next-line prefer-const
    let runner: Runner | undefined;

    const tools = this.services.tools.start({
      getRunner: () => {
        if (!runner) {
          throw new Error('Trying to access runner before initialization');
        }
        return runner;
      },
    });
    const runnerFactory = new RunnerFactoryImpl({
      logger: logger.get('runnerFactory'),
      security,
      elasticsearch,
      actions,
      inference,
      toolsService: tools,
    });
    runner = runnerFactory.getRunner();

    this.internalStart = {
      tools,
      runnerFactory,
    };

    return this.internalStart;
  }
}
