/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { ServerlessSystem } from './types';
import { parseServerlessDataset } from './parse_serverless_dataset';
import type { StreamLogDocument, StreamLogGenerator } from '../types';

export function createServerlessGenerator({
  system,
  log,
  targetRpm,
  streamType,
}: {
  system: ServerlessSystem;
  log: ToolingLog;
  targetRpm?: number;
  streamType: 'classic' | 'wired';
}): StreamLogGenerator {
  let index = 0;
  let start = 0;

  const { rpm: systemRpm, min, range } = parseServerlessDataset({ system });

  const count = system.hits.length;

  const speed = targetRpm === undefined ? 1 : targetRpm / systemRpm;

  log.debug(
    `Throughput for ${system.name} will be around ${Math.round(targetRpm ?? systemRpm)}rpm`
  );

  return {
    name: system.name,
    next: (timestamp) => {
      if (index === 0) {
        start = timestamp;
      }

      const docs: StreamLogDocument[] = [];

      while (true) {
        const hit = system.hits[index % count];

        const rotations = Math.floor(index / count);

        const originalDate = new Date(hit['@timestamp'] as string | number);

        const rel = (originalDate.getTime() - min) / range;

        // add 1 ms per rotation to separate start and end events
        const delta = (1 / speed) * range * (rel + rotations) + rotations;

        // ES likes its timestamp to be an integer
        const simulatedTimestamp = Math.floor(start + delta);
        if (simulatedTimestamp > timestamp) {
          break;
        }

        index++;

        const next = {
          ...hit,
          '@timestamp': simulatedTimestamp,
          _index: streamType === 'classic' ? system.name : undefined,
        };

        docs.push(next);
      }

      return docs;
    },
  };
}
