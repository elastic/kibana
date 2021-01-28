/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { writeFileSync } from 'fs';
import * as Either from '../../src/dev/code_coverage/ingest_coverage/either';
import { mkDir, finalDirAndFile, ndjsonToObj } from '../utils/utils';
import { join } from 'path';

const encoding = 'utf8';

const writeUtf8 = { flag: 'w', encoding };

const appendUtf8 = { flag: 'a', encoding };

const defaultTypes = ['index-pattern', 'search', 'visualization', 'dashboard'];

const isEmptyEither = (x) => (x === '' ? Either.left(x) : Either.right(x));

const prokEither = (resp) => isEmptyEither(resp.text).map(ndjsonToObj);

export const exportSavedObjects = (types = defaultTypes, excludeExportDetails = true) => async (
  log,
  supertest
) =>
  await supertest
    .post('/api/saved_objects/_export')
    .set('kbn-xsrf', 'anything')
    .send({
      type: types,
      excludeExportDetails,
    })
    .expect(200)
    .expect('Content-Type', /json/)
    .then(prokEither);

const writeOrAppend = (x) => (x === 0 ? Either.left(x) : Either.right(x));

const flush = (dest) => (savedObj, i) => {
  const writeToFile = writeFileSync.bind(null, dest);
  const writeCleaned = writeToFile.bind(null, `${JSON.stringify(savedObj)}\n\n`);

  writeOrAppend(i).fold(
    () => writeCleaned(writeUtf8),
    () => writeCleaned(appendUtf8)
  );
};

export const flushSavedObjects = (dest) => (log) => (payloadEither) =>
  payloadEither.fold(
    () => log.debug(`### Empty resp.text for:\n\t ${dest}`),
    (payload) => {
      log.verbose(`\n### payload: \n\t${JSON.stringify(payload, null, 2)}`);
      const flushToDestination = flush(dest);
      [...payload].forEach(flushToDestination);
      log.debug(`\n### Exported saved objects to destination: \n\t${dest}`);
    }
  );

const defaultDest = 'test/functional/fixtures/exported_saved_objects';

export const fetchSavedObjects = (dest = defaultDest) => (appName) => (log) => async (
  supertest
) => {
  const joined = join(dest, appName);
  const [destDir, destFilePath] = finalDirAndFile(joined)();

  mkDir(destDir);
  const exportUsingDefaults = exportSavedObjects();
  await flushSavedObjects(destFilePath)(log)(await exportUsingDefaults(log, supertest));
};
