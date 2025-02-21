/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once, orderBy } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { getParser } from '../src/get_parser';
import { LoghubSystem } from '../src/read_loghub_system_files';
import { validateParser } from '../src/validate_parser';
import { StreamLogDocument, StreamLogGenerator } from './types';

export function getLoghubGeneratorFactory({
  system,
  log,
}: {
  system: LoghubSystem;
  log: ToolingLog;
}): () => Promise<StreamLogGenerator> {
  const get = once(async () => {
    await validateParser(system);
    const parser = await getParser(system);
    const min = parser.getTimestamp(system.logLines[0]);
    const max = parser.getTimestamp(system.logLines[system.logLines.length - 1]);

    return {
      ...parser,
      min,
      max,
    };
  });

  const MAX_PER_MINUTE = 100;

  return async (): Promise<StreamLogGenerator> => {
    const parser = await get();
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

    const range = max - min;

    const rpm = count / (range / 1000 / 60);

    const speed = rpm > MAX_PER_MINUTE ? MAX_PER_MINUTE / rpm : 1;

    log.debug(`Indexing data for ${system.name} at ${speed.toPrecision(4)}`);

    return {
      range,
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
  };
}
