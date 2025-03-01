/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as Fs } from 'fs';
import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { LOGHUB_DIR } from './constants';

export interface LoghubSystem {
  name: string;
  readme: string;
  logLines: string[];
}

export async function readLoghubSystemFiles({ log }: { log: ToolingLog }): Promise<LoghubSystem[]> {
  log.debug(`Reading loghub files from ${LOGHUB_DIR}`);

  const systemFolders = await Fs.readdir(LOGHUB_DIR, { withFileTypes: true });

  const systems = await Promise.all(
    systemFolders.flatMap(async (dir): Promise<LoghubSystem[]> => {
      if (!dir.isDirectory() || dir.name.startsWith('.')) {
        return [];
      }

      const dirName = Path.join(LOGHUB_DIR, dir.name);

      const fileNames = await Fs.readdir(dirName);
      const readmeFileName = fileNames.find((fileName) => fileName.toLowerCase() === 'readme.md');
      const logFileName = fileNames.find((fileName) => Path.extname(fileName) === '.log');

      if (!logFileName) {
        throw new Error(`Could not find log file in ${dir.name}`);
      }

      const [readmeFile, logFile] = await Promise.all(
        [readmeFileName, logFileName].map(async (fileName) => {
          if (!fileName) {
            return '';
          }
          return await Fs.readFile(Path.join(dirName, fileName), 'utf-8');
        })
      );

      return [
        {
          name: dir.name,
          logLines: logFile
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          readme: readmeFile,
        },
      ];
    })
  );

  return systems.flat();
}
