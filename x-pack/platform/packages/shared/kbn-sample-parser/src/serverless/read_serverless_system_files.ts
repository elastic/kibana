/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as Fs } from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import pLimit from 'p-limit';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { SERVERLESS_LOGS_DIR } from './constants';
import { getFileOrThrow } from '../utils';
import type { ServerlessSystem } from './types';

export async function readServerlessSystemFiles({
  log,
}: {
  log: ToolingLog;
}): Promise<ServerlessSystem[]> {
  log.debug(`Reading serverless files from ${SERVERLESS_LOGS_DIR}`);

  const dirName = Path.join(SERVERLESS_LOGS_DIR, 'elastic_serverless_logging/samples');

  const files = await Fs.readdir(dirName, { withFileTypes: true });

  const limiter = pLimit(50);

  const systems = await Promise.all(
    files.flatMap(async (file): Promise<ServerlessSystem[]> => {
      if (!file.isFile() || Path.extname(file.name) !== '.json') {
        return [];
      }

      const fileContents = await limiter(() => getFileOrThrow(Path.join(dirName, file.name)));

      const parsed = JSON.parse(fileContents) as SearchResponse<Record<string, unknown>>;

      return [
        {
          name: file.name.replace('.json', ''),
          hits: parsed.hits.hits.map((hit) => hit._source!),
        },
      ];
    })
  );

  return systems.flat();
}
