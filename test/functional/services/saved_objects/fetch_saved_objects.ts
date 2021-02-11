/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync } from 'fs';
// @ts-ignore
import { join } from 'path';
// @ts-ignore
import { ToolingLog } from '@kbn/dev-utils';
import { SuperTest } from 'supertest';
import { mkDir, finalDirAndFile, ndjsonToObj, mark } from './utils';
// @ts-ignore
import * as Either from '../../../../src/dev/code_coverage/ingest_coverage/either';

const encoding = 'utf8';

const writeUtf8 = { flag: 'w', encoding };

const appendUtf8 = { flag: 'a', encoding };

const defaultTypes = ['index-pattern', 'search', 'visualization', 'dashboard'];

const isEmptyEither = (x: string) => (x === '' ? Either.left(x) : Either.right(x));

const prokEither = (resp: any) => isEmptyEither(resp.text).map(ndjsonToObj);

export const exportSavedObjects = (types = defaultTypes, excludeExportDetails = true) => async (
  log: ToolingLog,
  supertest: SuperTest<any>
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

const writeOrAppend = (x: number) => (x === 0 ? Either.left(x) : Either.right(x));

const flush = (dest: string) => (savedObj: any, i: number) => {
  const writeToFile = writeFileSync.bind(null, dest);
  const withTrailingNewLines: string = `${JSON.stringify(savedObj)}\n\n`;
  const writeCleaned = writeToFile.bind(null, withTrailingNewLines);

  writeOrAppend(i).fold(
    // @ts-ignore
    () => writeCleaned(writeUtf8),
    // @ts-ignore
    () => writeCleaned(appendUtf8)
  );
};

export const flushSavedObjects = (dest: string) => (log: ToolingLog) => (payloadEither: any) =>
  payloadEither.fold(
    () => log.debug(`${mark} Empty resp.text for:\n\t ${dest}`),
    (payload: any) => {
      log.verbose(`${mark} payload: \n\t${JSON.stringify(payload, null, 2)}`);
      const flushToDestination = flush(dest);
      [...payload].forEach(flushToDestination);
      log.debug(`${mark} Exported saved objects to destination: \n\t${dest}`);
    }
  );

export const fetchSavedObjects = (dataDir: string) => (log: ToolingLog) => (
  supertest: SuperTest<any>
) => async (appName: string) => {
  const joined = join(dataDir, appName);
  const [destDir, destFilePath] = finalDirAndFile(joined)();

  mkDir(destDir);
  const exportUsingDefaults = exportSavedObjects();
  await flushSavedObjects(destFilePath)(log)(await exportUsingDefaults(log, supertest));
};
