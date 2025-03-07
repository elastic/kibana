/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import { LoghubSystem } from '../src/read_loghub_system_files';
import { LoghubParser } from '../src/types';

export function parseDataset({ system, parser }: { parser: LoghubParser; system: LoghubSystem }) {
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

  return {
    lines: parsedLogLines,
    rpm,
    range,
    min,
    max,
  };
}
