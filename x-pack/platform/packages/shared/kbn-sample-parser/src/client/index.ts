/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { getLoghubGenerators } from '../loghub/get_loghub_generators';
import { getServerlessGenerators } from '../serverless/get_serverless_generators';
import type { StreamLogGenerator } from '../types';

export class SampleParserClient {
  private readonly logger: ToolingLog;
  constructor(options: { logger: ToolingLog }) {
    this.logger = options.logger;
  }

  async getLogGenerators({
    rpm = 10000,
    distribution = 'uniform',
    systems = {},
    streamType = 'wired',
  }: {
    rpm?: number;
    distribution?: 'relative' | 'uniform';
    systems: {
      loghub?: boolean | string[];
      serverless?: boolean | string[];
    };
    streamType?: 'classic' | 'wired';
  }): Promise<StreamLogGenerator[]> {
    const { loghub, serverless } = systems;

    const includeLoghub = typeof loghub === 'boolean' ? loghub : !!loghub?.length;
    const includeServerless = typeof serverless === 'boolean' ? serverless : !!serverless?.length;

    const requestedLoghubSystems = Array.isArray(loghub) ? loghub : undefined;
    const requestedServerlessSystems = Array.isArray(serverless) ? serverless : undefined;

    const [loghubGenerators, serverlessGenerators] = await Promise.all([
      includeLoghub
        ? getLoghubGenerators({
            systems: requestedLoghubSystems,
            log: this.logger,
            distribution,
            rpm,
            streamType,
          })
        : Promise.resolve([]),
      includeServerless
        ? getServerlessGenerators({
            systems: requestedServerlessSystems,
            log: this.logger,
            distribution,
            rpm,
            streamType,
          })
        : Promise.resolve([]),
    ]);

    const allGenerators = [...loghubGenerators, ...serverlessGenerators];

    if (!allGenerators.length) {
      throw new Error(`No generators found for ${JSON.stringify(systems)}`);
    }

    return allGenerators;
  }
}
