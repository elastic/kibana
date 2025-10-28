/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { once, sumBy } from 'lodash';
import { ensureServerlessRepo } from './ensure_serverless_logs_repo';
import type { StreamLogGenerator } from '../types';
import { readServerlessSystemFiles } from './read_serverless_system_files';
import { parseServerlessDataset } from './parse_serverless_dataset';
import { createServerlessGenerator } from './create_serverless_generator';
import type { ServerlessSystem } from './types';

const getSystems = once(async ({ log }: { log: ToolingLog }): Promise<ServerlessSystem[]> => {
  await ensureServerlessRepo({ log });

  return await readServerlessSystemFiles({ log });
});

export async function getServerlessGenerators({
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

  const filters = requestedSystems?.map((system) => {
    if (system.includes('*')) {
      const parts = system.split('*');
      return (val: string) => {
        const index = 0;
        for (const part of parts) {
          const next = val.indexOf(part, index);
          if (next === -1) {
            return false;
          }
        }
        return true;
      };
    }

    return (val: string) => {
      return val.includes(system);
    };
  });

  if (requestedSystems?.length) {
    systems = systems.filter((system) => {
      return filters?.some((filter) => filter(system.name));
    });
  }

  if (!systems && requestedSystems?.length) {
    throw new Error(`No systems found matching one of ${requestedSystems.join(', ')}`);
  }

  const results = await Promise.all(
    systems.map(async (system) => {
      const { rpm: systemRpm, hits } = parseServerlessDataset({ system });

      return {
        system: {
          ...system,
          hits,
        },
        rpm: systemRpm,
      };
    })
  );

  const totalRpm = sumBy(results, ({ rpm: systemRpm }) => systemRpm);

  return await Promise.all(
    results.map(({ system, rpm: systemRpm }) => {
      let targetRpm: number;
      if (distribution === 'relative') {
        const share = systemRpm / totalRpm;
        targetRpm = rpm === undefined ? Math.min(100, systemRpm) : share * rpm;
      } else {
        targetRpm = Math.round(rpm / results.length);
      }

      return createServerlessGenerator({
        system,
        log,
        targetRpm: Math.max(1, targetRpm),
        streamType,
      });
    })
  );
}
