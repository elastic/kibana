/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import { ToolingLog } from '@kbn/dev-utils';
import { SuperTest } from 'supertest';
// @ts-ignore
import * as Either from '../../../../src/dev/code_coverage/ingest_coverage/either';
import { id } from './utils';

const recurseEither = (max: number) => (x: number) => (max > x ? Either.right(x) : Either.left(x));

export const recurseList = (f: any) => (dataDir: string) => (log: ToolingLog) => (
  supertest: SuperTest<any>
) => async (names: any, i: number = 1) => {
  const appName = names[i - 1];
  await f(dataDir)(appName)(log)(supertest);

  recurseEither(names.length)(i) // Recurses only when names.length is less than i
    .fold(id, async function recurseListInner() {
      i++;
      await recurseList(f)(dataDir)(log)(supertest)(names, i);
    });
};
