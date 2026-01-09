/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import Fs from 'fs/promises';
import { ensureServerlessRepo } from './ensure_serverless_logs_repo';
import { SERVERLESS_LOGS_DIR } from './constants';

export async function listServerlessSystemFiles({ log }: { log: ToolingLog }): Promise<string[]> {
  await ensureServerlessRepo({ log });

  log.debug(`Reading serverless files from ${SERVERLESS_LOGS_DIR}`);

  const dirName = Path.join(SERVERLESS_LOGS_DIR, 'elastic_serverless_logging/samples');

  const files = await Fs.readdir(dirName, { withFileTypes: true });

  const systemFiles = await Promise.all(
    files.flatMap(async (file): Promise<string[]> => {
      if (!file.isFile() || Path.extname(file.name) !== '.json') {
        return [];
      }
      return [file.name];
    })
  );

  return systemFiles.flat();
}
