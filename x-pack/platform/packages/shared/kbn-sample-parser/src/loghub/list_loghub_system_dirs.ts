/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { promises as Fs } from 'fs';
import { LOGHUB_DIR } from './constants';

export async function listLoghubSystemDirs({ log }: { log: ToolingLog }): Promise<string[]> {
  log.debug(`Reading loghub files from ${LOGHUB_DIR}`);

  const systemFolders = await Fs.readdir(LOGHUB_DIR, { withFileTypes: true });

  const dirs = await Promise.all(
    systemFolders.flatMap(async (dir): Promise<string[]> => {
      if (!dir.isDirectory() || dir.name.startsWith('.')) {
        return [];
      }

      return [dir.name];
    })
  );

  return dirs.flat();
}
