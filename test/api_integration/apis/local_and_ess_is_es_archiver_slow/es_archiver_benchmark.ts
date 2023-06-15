/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint no-console: ["error",{ allow: ["log"] }] */

import { PathLike } from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import type {
  RuntimeEnv,
  RelativeLogDirectoryName,
  LoadResults,
  LoadResult,
  ArchiveWithManyFieldsAndOrManyDocs,
} from './shared.types';
import {
  absolutePathForLogsDirectory,
  metricsFactory,
  isDryRun,
  afterAll,
  printInfoAndInitOutputLogging,
  testsLoop,
  LOOP_LIMIT,
  archives,
} from './utils';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

const LOGS_DIR: RelativeLogDirectoryName =
  'test/api_integration/apis/local_and_ess_is_es_archiver_slow/logs';
const RUNTIME_ENV: RuntimeEnv = (process.env.RUNTIME_ENV as RuntimeEnv) ?? 'LOCAL';

const results: LoadResults = new Set(
  archives.map((x: string): LoadResult => {
    return {
      name: x,
      label: '',
      metrics: [],
      avg: 0,
      min: 0,
      max: 0,
    };
  })
);

export default function suiteFactory({ getService }: FtrProviderContext): void {
  const esArchiver = getService('esArchiver');
  const log: ToolingLog = getService('log');
  const logDirAbsolutePath: PathLike = absolutePathForLogsDirectory(LOGS_DIR);
  const push = metricsFactory(results);
  describe(`Loop for Measuring Es Archiver Perf on Cloud (ESS) and Local, not Serverless`, function localAndEssBigLoopSuite(): void {
    before(
      async (): Promise<void> =>
        await printInfoAndInitOutputLogging(
          log,
          archives as unknown as ArchiveWithManyFieldsAndOrManyDocs[],
          logDirAbsolutePath,
          LOOP_LIMIT
        )
    );

    archives.forEach(testsLoop(esArchiver, log, LOOP_LIMIT, isDryRun(), push, logDirAbsolutePath));

    after(async (): Promise<any> => await afterAll(RUNTIME_ENV, logDirAbsolutePath, results)(log));
  });
}
