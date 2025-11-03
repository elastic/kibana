/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as Fs } from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { LOGHUB_DIR } from './constants';
import { getFileOrThrow } from '../utils';

export interface LoghubSystem {
  name: string;
  readme: string;
  templates: string[];
  logLines: string[];
}

function toLines(contents: string) {
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
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
      const templateFileName = fileNames.find((fileName) => fileName.endsWith('_templates.csv'));

      if (!logFileName) {
        throw new Error(`Could not find log file in ${dir.name}`);
      }

      if (!templateFileName) {
        throw new Error(`Could not find template file in ${dir.name}`);
      }

      const [readmeFile, logFile, templateFile] = await Promise.all(
        [readmeFileName, logFileName, templateFileName].map(async (fileName) => {
          if (!fileName) {
            return '';
          }
          return getFileOrThrow(Path.join(dirName, fileName));
        })
      );

      return [
        {
          name: dir.name,
          logLines: toLines(logFile),
          readme: readmeFile,
          templates: toLines(templateFile),
        },
      ];
    })
  );

  return systems.flat();
}
