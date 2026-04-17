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

/**
 * - `source`: preserve relative timing from the LogHub file (`systemRpm` / timestamp spread).
 * - `uniform_interval`: emit one document every `60000 / targetRpm` ms in simulation time, cycling
 *   lines for message content only. Same `targetRpm` across systems → comparable document counts per
 *   `[from, to]` window (synthtrace / eval seeding).
 */
export type LoghubTimestampLayout = 'source' | 'uniform_interval';

export function createLoghubGenerator({
  system,
  parser,
  log,
  targetRpm,
  streamType,
  timestampLayout = 'source',
}: {
  system: LoghubSystem;
  parser: LoghubParser;
  log: ToolingLog;
  targetRpm?: number;
  streamType: 'classic' | 'wired';
  timestampLayout?: LoghubTimestampLayout;
}): StreamLogGenerator {
  let index = 0;
  let start = 0;

  const { rpm: systemRpm, lines, min, range } = parseDataset({ system, parser });

  const count = lines.length;

  const speed = targetRpm === undefined ? 1 : targetRpm / systemRpm;

  const filepath = `${system.name}.log`;

  const effectiveRpm = Math.max(1, Math.round(targetRpm ?? systemRpm));
  const msBetween = 60000 / effectiveRpm;

  if (timestampLayout === 'uniform_interval') {
    log.debug(
      `LogHub ${system.name}: uniform_interval ~${effectiveRpm}rpm (${msBetween.toFixed(2)}ms/doc)`
    );
  } else {
    log.debug(
      `Throughput for ${system.name} will be around ${Math.round(targetRpm ?? systemRpm)}rpm`
    );
  }

  return {
    name: system.name,
    next: (timestamp) => {
      if (index === 0) {
        start = timestamp;
      }

      const docs: StreamLogDocument[] = [];

      if (timestampLayout === 'uniform_interval') {
        while (true) {
          const simulatedTimestamp = Math.floor(start + index * msBetween);

          if (simulatedTimestamp > timestamp) {
            break;
          }

          const line = lines[index % count];
          index++;

          docs.push({
            '@timestamp': simulatedTimestamp,
            message: parser.replaceTimestamp(line.message, simulatedTimestamp),
            ...parser.getFakeMetadata(line.message),
            filepath,
            _index:
              streamType === 'classic' ? `logs-${system.name.toLowerCase()}-default` : undefined,
          });
        }

        return docs;
      }

      const safeRange = range > 0 ? range : 1;

      while (true) {
        const line = lines[index % count];

        const rotations = Math.floor(index / count);

        const rel = (line.timestamp - min) / safeRange;

        // add 1 ms per rotation to separate start and end events
        const delta = (1 / speed) * safeRange * (rel + rotations) + rotations;

        // ES likes its timestamp to be an integer
        const simulatedTimestamp = Math.floor(start + delta);

        if (simulatedTimestamp > timestamp) {
          break;
        }

        index++;

        docs.push({
          '@timestamp': simulatedTimestamp,
          message: parser.replaceTimestamp(line.message, simulatedTimestamp),
          ...parser.getFakeMetadata(line.message),
          filepath,
          _index:
            streamType === 'classic' ? `logs-${system.name.toLowerCase()}-default` : undefined,
        });
      }

      return docs;
    },
  };
}
