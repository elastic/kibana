/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type LoghubSystem } from './read_loghub_system_files';
import { getQueriesFilename } from './utils';
import { LoghubQuery } from './validate_queries';

export async function getQueries(system: LoghubSystem): Promise<LoghubQuery[]> {
  const fileName = getQueriesFilename(system);

  const { queries } = (await import(fileName)) as { queries: LoghubQuery[] };
  return queries;
}
