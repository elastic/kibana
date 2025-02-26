/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { LoghubSystem } from '../src/read_loghub_system_files';
import { LoghubParser } from '../src/types';
import { StreamLogDocument, StreamLogGenerator } from './types';
import { parseDataset } from './parse_dataset';

export function createLoghubGenerator({
  system,
  parser,
  log,
  targetRpm,
}: {
  system: LoghubSystem;
  parser: LoghubParser;
  log: ToolingLog;
  targetRpm?: number;
}): StreamLogGenerator {
  let index = 0;
  let start = 0;

  const { rpm: systemRpm, lines, min, range } = parseDataset({ system, parser });

  const count = lines.length;

  const speed = targetRpm === undefined ? 1 : targetRpm / systemRpm;

  log.debug(`Indexing data for ${system.name} at ${speed.toPrecision(4)}`);

  return {
    next: (timestamp) => {
      if (index === 0) {
        start = timestamp;
      }

      const docs: StreamLogDocument[] = [];

      while (true) {
        const line = lines[index % count];

        const rotations = Math.floor(index / count);

        const rel = (line.timestamp - min) / range;

        const delta = (1 / speed) * range * (rotations + rel);

        const simulatedTimestamp = Math.floor(start + delta);

        if (simulatedTimestamp > timestamp) {
          break;
        }

        index++;

        const next = {
          '@timestamp': simulatedTimestamp,
          message: parser.replaceTimestamp(line.message, simulatedTimestamp),
          filepath: `${system.name}_2k.log`,
        };

        docs.push(next);
      }

      return docs;
    },
  };
}
