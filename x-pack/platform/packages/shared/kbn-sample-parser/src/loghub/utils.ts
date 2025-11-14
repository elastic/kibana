/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { LOGHUB_PARSER_DIR } from './constants';
import type { LoghubSystem } from './read_loghub_system_files';

export function getParserFilename(system: LoghubSystem) {
  return Path.join(LOGHUB_PARSER_DIR, system.name, 'parser.ts');
}

export function getQueriesFilename(system: LoghubSystem) {
  return Path.join(LOGHUB_PARSER_DIR, system.name, 'queries.json');
}
