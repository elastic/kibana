/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type { RunningQueriesServerSetup, RunningQueriesServerStart } from './types';

export class RunningQueriesPlugin
  implements Plugin<RunningQueriesServerSetup, RunningQueriesServerStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup): RunningQueriesServerSetup {
    this.logger.debug('runningQueries: Setup');
    return {};
  }

  public start(core: CoreStart): RunningQueriesServerStart {
    this.logger.debug('runningQueries: Started');
    return {};
  }

  public stop(): void {}
}
