/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { PLUGIN_ID, PNG_JOB_TYPE } from '../../../../common/constants';
import {
  ServerFacade,
  ExecuteJobFactory,
  ESQueueWorkerExecuteFn,
  HeadlessChromiumDriverFactory,
} from '../../../../types';
import { LevelLogger } from '../../../../server/lib';
import {
  decryptJobHeaders,
  omitBlacklistedHeaders,
  getConditionalHeaders,
  getFullUrls,
} from '../../../common/execute_job/';
import { JobDocPayloadPNG } from '../../types';
import { generatePngObservableFactory } from '../lib/generate_png';

type QueuedPngExecutorFactory = ExecuteJobFactory<ESQueueWorkerExecuteFn<JobDocPayloadPNG>>;

export const executeJobFactory: QueuedPngExecutorFactory = function executeJobFactoryFn(
  server: ServerFacade,
  { browserDriverFactory }: { browserDriverFactory: HeadlessChromiumDriverFactory }
) {
  const generatePngObservable = generatePngObservableFactory(server, browserDriverFactory);
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, PNG_JOB_TYPE, 'execute']);

  return function executeJob(
    jobId: string,
    jobToExecute: JobDocPayloadPNG,
    cancellationToken: any
  ) {
    const jobLogger = logger.clone([jobId]);
    const process$ = Rx.of({ job: jobToExecute, server, logger }).pipe(
      mergeMap(decryptJobHeaders),
      map(omitBlacklistedHeaders),
      map(getConditionalHeaders),
      mergeMap(getFullUrls),
      mergeMap(({ job, conditionalHeaders, urls }) => {
        const hashUrl = urls[0];
        return generatePngObservable(
          jobLogger,
          hashUrl,
          job.browserTimezone,
          conditionalHeaders,
          job.layout
        );
      }),
      map((buffer: Buffer) => {
        return {
          content_type: 'image/png',
          content: buffer.toString('base64'),
          size: buffer.byteLength,
        };
      }),
      catchError(err => {
        jobLogger.error(err);
        return Rx.throwError(err);
      })
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);
    return process$.pipe(takeUntil(stop$)).toPromise();
  };
};
