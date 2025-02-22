/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { StreamLogGenerator } from './types';
import { readLoghubSystemFiles } from '../src/read_loghub_system_files';
import { getLoghubGeneratorFactory } from './get_loghub_generator_factory';
import { ensureLoghubRepo } from '../src/ensure_loghub_repo';
import { validateParser } from '../src/validate_parser';

export class SampleParserClient {
  private readonly logger: ToolingLog;
  constructor(options: { logger: ToolingLog }) {
    this.logger = options.logger;
  }

  async getLogGenerators(): Promise<StreamLogGenerator[]> {
    await ensureLoghubRepo({ log: this.logger });
    const systems = await readLoghubSystemFiles({ log: this.logger });

    const generators = await Promise.all(
      systems.map(async (system) => {
        await validateParser(system).catch((error) => {
          throw new AggregateError([error], `Parser for ${system.name} is not valid`);
        });
        return getLoghubGeneratorFactory({ system, log: this.logger })();
      })
    );

    return generators;
  }
}
