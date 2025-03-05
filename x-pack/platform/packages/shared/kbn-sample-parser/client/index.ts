/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { sumBy } from 'lodash';
import { StreamLogGenerator } from './types';
import { readLoghubSystemFiles } from '../src/read_loghub_system_files';
import { ensureLoghubRepo } from '../src/ensure_loghub_repo';
import { validateParser } from '../src/validate_parser';
import { getParser } from '../src/get_parser';
import { createLoghubGenerator } from './create_loghub_generator';
import { parseDataset } from './parse_dataset';
import { validateQueries } from '../src/validate_queries';
import { getQueries } from '../src/get_queries';

export class SampleParserClient {
  private readonly logger: ToolingLog;
  constructor(options: { logger: ToolingLog }) {
    this.logger = options.logger;
  }

  async getLogGenerators({
    rpm = 10000,
    distribution = 'uniform',
  }: {
    rpm?: number;
    distribution?: 'relative' | 'uniform';
  }): Promise<StreamLogGenerator[]> {
    await ensureLoghubRepo({ log: this.logger });
    const systems = await readLoghubSystemFiles({ log: this.logger });

    const results = await Promise.all(
      systems.map(async (system) => {
        await Promise.all([validateParser(system), validateQueries(system)]).catch((error) => {
          throw new AggregateError([error], `Parser for ${system.name} is not valid`);
        });

        const [parser, queries] = await Promise.all([getParser(system), getQueries(system)]);
        const { rpm: systemRpm } = parseDataset({ system, parser });

        return {
          parser,
          system,
          rpm: systemRpm,
          queries,
        };
      })
    );

    const totalRpm = sumBy(results, ({ rpm: systemRpm }) => systemRpm);

    return await Promise.all(
      results.map(({ system, parser, rpm: systemRpm, queries }) => {
        let targetRpm: number;
        if (distribution === 'relative') {
          const share = systemRpm / totalRpm;
          targetRpm = rpm === undefined ? Math.min(100, systemRpm) : share * rpm;
        } else {
          targetRpm = Math.round(rpm / results.length);
        }

        return createLoghubGenerator({
          system,
          parser,
          log: this.logger,
          targetRpm: Math.max(1, targetRpm),
          queries,
        });
      })
    );
  }
}
