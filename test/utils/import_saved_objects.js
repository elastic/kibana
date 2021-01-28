/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { finalDirAndFile } from '../utils/utils';
import { readFileSync } from 'fs';

export const importData = (srcFilePath) => async (log, supertest) => {
  const data = readFileSync(srcFilePath, 'utf8');
  const buffer = Buffer.from(data, 'utf8');

  await supertest
    .post('/api/saved_objects/_import')
    .query({ overwrite: true })
    .set('kbn-xsrf', 'anything')
    .attach('file', buffer, srcFilePath)
    // .expect(200)
    .then((resp) => {
      log.debug(`\n### import response: \n\t${JSON.stringify(resp, null, 2)}`);
    })
    .catch((err) => {
      log.debug(`\n### caught error - import response: \n\t${JSON.stringify(err, null, 2)}`);
    });
};

export const importSavedObjects = (inputDir) => (log) => async (supertest) => {
  const [, inputFilePath] = finalDirAndFile(inputDir)();

  log.debug(`\n### Importing saved objects from path: \n\t${inputFilePath}`);
  importData(inputFilePath)(log, supertest);
};
