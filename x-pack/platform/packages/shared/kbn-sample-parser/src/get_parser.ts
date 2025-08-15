/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type LoghubSystem } from './read_loghub_system_files';
import type { LoghubParser } from './types';
import { getParserFilename } from './utils';

export async function getParser(system: LoghubSystem): Promise<LoghubParser> {
  const fileName = getParserFilename(system);

  return (await import(fileName)) as LoghubParser;
}
