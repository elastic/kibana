/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { createPatternTesterWorkerConfig, RegexWorkerService } from '@kbn/ai-anonymization-server';
import type { AiAnonymizationSettingsConfig } from './config';
import { registerPatternTesterRoute } from './routes/pattern_tester';

export class AiAnonymizationSettingsPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly config: AiAnonymizationSettingsConfig;
  // Dedicated to the pattern tester: a timed-out task rebuilds the whole pool, so tested patterns
  // must never share one with real `chatComplete` traffic.
  private patternTesterWorker?: RegexWorkerService;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.config = initContext.config.get<AiAnonymizationSettingsConfig>();
  }

  public setup(core: CoreSetup) {
    this.patternTesterWorker = new RegexWorkerService(
      createPatternTesterWorkerConfig({ enabled: this.config.patternTester.enabled }),
      this.logger.get('pattern_tester_worker')
    );

    registerPatternTesterRoute({
      router: core.http.createRouter(),
      getStartServices: core.getStartServices,
      getRegexWorker: () => this.patternTesterWorker,
      logger: this.logger.get('pattern_tester'),
    });

    return {};
  }

  public start() {
    return {};
  }

  public async stop() {
    await this.patternTesterWorker?.stop();
  }
}
