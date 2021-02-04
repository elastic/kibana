/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { SuperTest } from 'supertest';
// @ts-ignore
import { ToolingLog } from '@kbn/dev-utils';
import { join } from 'path';
import { finalDirAndFile, mark } from './utils';
import { recurseList } from './recurse_list';

export const importData = (srcFilePath: string) => async (
  log: ToolingLog,
  supertest: SuperTest<any>
) =>
  await supertest
    .post('/api/saved_objects/_import')
    .query({ overwrite: true })
    .set('kbn-xsrf', 'anything')
    .attach('file', readFileSync(srcFilePath), srcFilePath)
    .expect(200)
    .then(() => log.info(`${mark} import successful of ${srcFilePath}`))
    .catch((err: any) =>
      log.error(`${mark} caught error - import response: \n\t${JSON.stringify(err, null, 2)}`)
    );

export const importSavedObjects = (dataDir: string) => (appName: string) => (
  log: ToolingLog
) => async (supertest: SuperTest<any>) => {
  const from = join(dataDir, appName);
  const [, inputFilePath] = finalDirAndFile(from)();

  log.info(`${mark} Importing saved objects from path: \n\t${inputFilePath}`);
  importData(inputFilePath)(log, supertest);
};

export const importList = (dataDir: string) => (log: ToolingLog) => (
  supertest: SuperTest<any>
) => async (names: string[]) =>
  await recurseList(importSavedObjects)(dataDir)(log)(supertest)(names);
