/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { AiAnonymizationSettingsConfig } from './config';
import { PatternTesterWorker } from './pattern_tester_worker';
import { registerPatternTesterRoute } from './routes/pattern_tester';
import type {
  AiAnonymizationSettingsPluginSetup,
  AiAnonymizationSettingsPluginStart,
} from './types';

export class AiAnonymizationSettingsPlugin
  implements Plugin<AiAnonymizationSettingsPluginSetup, AiAnonymizationSettingsPluginStart>
{
  private readonly logger: Logger;
  private readonly patternTesterWorker: PatternTesterWorker;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    const config = initContext.config.get<AiAnonymizationSettingsConfig>();
    this.patternTesterWorker = new PatternTesterWorker({
      enabledByConfig: config.patternTester.enabled,
      logger: this.logger.get('pattern_tester_worker'),
    });
  }

  public setup(core: CoreSetup): AiAnonymizationSettingsPluginSetup {
    registerPatternTesterRoute({
      router: core.http.createRouter(),
      getStartServices: core.getStartServices,
      getRegexWorker: () => this.patternTesterWorker.get(),
      logger: this.logger.get('pattern_tester'),
    });

    return {
      configurePatternTester: (options) => this.patternTesterWorker.configure(options),
    };
  }

  public start(): AiAnonymizationSettingsPluginStart {
    return {};
  }

  public async stop() {
    await this.patternTesterWorker.stop();
  }
}
