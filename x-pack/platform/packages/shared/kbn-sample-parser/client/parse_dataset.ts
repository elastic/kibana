/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
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

  const min = parsedLogLines[0].timestamp;

  let minTimestamp = min;
  let years = 0;

  // add years for timestamps without years
  parsedLogLines.forEach((logLine) => {
    if (logLine.timestamp < minTimestamp) {
      minTimestamp = logLine.timestamp;
      years++;
    }
    if (years >= 0) {
      logLine.timestamp = moment(logLine.timestamp).add(years, 'years').valueOf();
    }
  });

  const max = parsedLogLines[parsedLogLines.length - 1].timestamp;

  const count = parsedLogLines.length;

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
