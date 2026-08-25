/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type LoghubSystem } from './read_loghub_system_files';
import { getFileOrThrow } from '../utils';
import { getParser } from './get_parser';
import { getParserFilename } from './utils';

export async function validateParser(system: LoghubSystem): Promise<void> {
  const [{ getTimestamp, replaceTimestamp, getFakeMetadata }, parserFileContents] =
    await Promise.all([getParser(system), getFileOrThrow(getParserFilename(system))]);

  let successfullyParsed = 0;
  system.logLines.forEach((logLine, index) => {
    try {
      const timestamp = getTimestamp(logLine);
      if (isNaN(timestamp)) {
        throw new Error(`getTimestamp: no valid date extracted`);
      }

      const next = replaceTimestamp(logLine, timestamp);

      const extracted = getTimestamp(next);

      const metadata = getFakeMetadata(logLine);

      if (metadata === undefined) {
        throw new Error(`getFakeMetadata: no metadata extracted`);
      }

      const isEqual = extracted === timestamp;

      if (!isEqual) {
        throw new Error(`replaceTimestamp: expected ${next}`);
      }
    } catch (error) {
      error.message += `
          Line: "${logLine}"
          Index: ${index}
          Lines successfully parsed: ${successfullyParsed}
          Example of successfully parsed line: ${system.logLines[index - 1] ?? '-'}
          Source:

          ${parserFileContents}`;
      throw error;
    }

    successfullyParsed++;
  });
}
