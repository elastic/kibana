/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { parseDataset } from './parse_dataset';
import type { LoghubSystem } from './read_loghub_system_files';
import type { LoghubParser } from './types';
import type { StreamLogDocument, StreamLogGenerator } from '../types';

export function createLoghubGenerator({
  system,
  parser,
  log,
  targetRpm,
  streamType,
}: {
  system: LoghubSystem;
  parser: LoghubParser;
  log: ToolingLog;
  targetRpm?: number;
  streamType: 'classic' | 'wired';
}): StreamLogGenerator {
  let index = 0;
  let start = 0;

  const { rpm: systemRpm, lines, min, range } = parseDataset({ system, parser });

  const count = lines.length;

  const speed = targetRpm === undefined ? 1 : targetRpm / systemRpm;

  const filepath = `${system.name}.log`;

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
        const line = lines[index % count];

        const rotations = Math.floor(index / count);

        const rel = (line.timestamp - min) / range;

        // add 1 ms per rotation to separate start and end events
        const delta = (1 / speed) * range * (rel + rotations) + rotations;

        // ES likes its timestamp to be an integer
        const simulatedTimestamp = Math.floor(start + delta);

        if (simulatedTimestamp > timestamp) {
          break;
        }

        index++;

        const next = {
          '@timestamp': simulatedTimestamp,
          message: parser.replaceTimestamp(line.message, simulatedTimestamp),
          ...parser.getFakeMetadata(line.message),
          filepath,
          _index:
            streamType === 'classic' ? `logs-${system.name.toLowerCase()}-default` : undefined,
        };

        docs.push(next);
      }

      return docs;
    },
  };
}
