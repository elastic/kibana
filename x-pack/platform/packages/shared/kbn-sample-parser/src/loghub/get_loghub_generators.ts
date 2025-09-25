/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { once, sumBy } from 'lodash';
import { ensureLoghubRepo } from './ensure_loghub_repo';
import type { LoghubSystem } from './read_loghub_system_files';
import { readLoghubSystemFiles } from './read_loghub_system_files';
import { validateParser } from './validate_parser';
import { validateQueries } from './validate_queries';
import { getParser } from './get_parser';
import { getQueries } from './get_queries';
import { parseDataset } from './parse_dataset';
import { createLoghubGenerator } from './create_loghub_generator';
import type { StreamLogGenerator } from '../types';

const getSystems = once(async ({ log }: { log: ToolingLog }): Promise<LoghubSystem[]> => {
  await ensureLoghubRepo({ log });

  return await readLoghubSystemFiles({ log });
});

export async function getLoghubGenerators({
  systems: requestedSystems,
  log,
  distribution,
  rpm,
  streamType,
}: {
  systems?: string[];
  log: ToolingLog;
  distribution: 'uniform' | 'relative';
  rpm: number;
  streamType: 'classic' | 'wired';
}): Promise<StreamLogGenerator[]> {
  let systems = await getSystems({ log });

  if (requestedSystems?.length) {
    systems = systems.filter((system) => requestedSystems.includes(system.name));
  }

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
    results.map(({ system, parser, rpm: systemRpm }) => {
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
        log,
        targetRpm: Math.max(1, targetRpm),
        streamType,
      });
    })
  );
}
