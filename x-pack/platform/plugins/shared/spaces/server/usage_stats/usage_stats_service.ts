/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';

import { SPACES_USAGE_STATS_TYPE } from './constants';
import { UsageStatsClient } from './usage_stats_client';

export interface UsageStatsServiceSetup {
  getClient(): UsageStatsClient;
}

interface UsageStatsServiceDeps {
  getStartServices: CoreSetup['getStartServices'];
}

export class UsageStatsService {
  constructor(private readonly log: Logger) {}

  public async setup({ getStartServices }: UsageStatsServiceDeps): Promise<UsageStatsServiceSetup> {
    const internalRepositoryPromise = getStartServices().then(([coreStart]) =>
      coreStart.savedObjects.createInternalRepository([SPACES_USAGE_STATS_TYPE])
    );

    const getClient = () => {
      const debugLogger = (message: string) => this.log.debug(message);
      return new UsageStatsClient(debugLogger, internalRepositoryPromise);
    };

    return { getClient };
  }

  public async stop() {}
}
