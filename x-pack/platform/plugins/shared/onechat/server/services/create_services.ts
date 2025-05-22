/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSetupServices, InternalStartServices, ServicesStartDeps } from './types';
import { ToolsService } from './tools';
import { RunnerFactoryImpl } from './runner';

interface ServiceInstances {
  tools: ToolsService;
}

export class ServiceManager {
  private services?: ServiceInstances;
  private internalSetup?: InternalSetupServices;
  private internalStart?: InternalStartServices;

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

    const tools = this.services.tools.start();
    const runnerFactory = new RunnerFactoryImpl({
      logger: logger.get('runnerFactory'),
      security,
      elasticsearch,
      actions,
      inference,
      toolsService: tools,
    });

    this.internalStart = {
      tools,
      runnerFactory,
    };

    return this.internalStart;
  }
}
