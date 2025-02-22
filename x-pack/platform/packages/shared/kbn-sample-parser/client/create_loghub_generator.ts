/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { orderBy } from 'lodash';
import { LoghubSystem } from '../src/read_loghub_system_files';
import { LoghubParser } from '../src/types';
import { StreamLogDocument, StreamLogGenerator } from './types';

export function createLoghubGenerator({
  system,
  parser,
  log,
}: {
  system: LoghubSystem;
  parser: LoghubParser;
  log: ToolingLog;
}): StreamLogGenerator {
  const MAX_PER_MINUTE = 100;
  let index = 0;
  let start = 0;
  const parsedLogLines = system.logLines.map((line) => {
    const timestamp = parser.getTimestamp(line);
    return {
      timestamp,
      message: line,
    };
  });

  const sortedLogLines = orderBy(parsedLogLines, (line) => line.timestamp, 'asc');

  const min = sortedLogLines[0].timestamp;
  const max = sortedLogLines[parsedLogLines.length - 1].timestamp;

  const count = sortedLogLines.length;

  // add one to separate start and end event
  const range = max - min + 1;

  const rpm = count / (range / 1000 / 60);

  const speed = rpm > MAX_PER_MINUTE ? MAX_PER_MINUTE / rpm : 1;

  log.debug(`Indexing data for ${system.name} at ${speed.toPrecision(4)}`);

  return {
    next: (timestamp) => {
      if (index === 0) {
        start = timestamp;
      }

      const docs: StreamLogDocument[] = [];

      while (true) {
        const line = sortedLogLines[index % count];

        const rotations = Math.floor(index / count);

        const rel = (line.timestamp - min) / range;

        const delta = speed * range * (rotations + rel);

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
