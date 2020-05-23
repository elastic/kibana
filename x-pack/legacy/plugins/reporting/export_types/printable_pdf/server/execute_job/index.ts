/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { catchError, map, mergeMap, takeUntil } from 'rxjs/operators';
import { PDF_JOB_TYPE } from '../../../../common/constants';
import { ReportingCore } from '../../../../server';
import { ESQueueWorkerExecuteFn, ExecuteJobFactory, JobDocOutput, Logger } from '../../../../types';
import {
  decryptJobHeaders,
  getConditionalHeaders,
  getCustomLogo,
  getFullUrls,
  omitBlacklistedHeaders,
} from '../../../common/execute_job/';
import { JobDocPayloadPDF } from '../../types';
import { generatePdfObservableFactory } from '../lib/generate_pdf';

type QueuedPdfExecutorFactory = ExecuteJobFactory<ESQueueWorkerExecuteFn<JobDocPayloadPDF>>;

export const executeJobFactory: QueuedPdfExecutorFactory = async function executeJobFactoryFn(
  reporting: ReportingCore,
  parentLogger: Logger
) {
  const config = reporting.getConfig();
  const encryptionKey = config.get('encryptionKey');

  const logger = parentLogger.clone([PDF_JOB_TYPE, 'execute']);

  return async function executeJob(jobId: string, job: JobDocPayloadPDF, cancellationToken: any) {
    const generatePdfObservable = await generatePdfObservableFactory(reporting);

    const jobLogger = logger.clone([jobId]);
    const process$: Rx.Observable<JobDocOutput> = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders({ encryptionKey, job, logger })),
      map(decryptedHeaders => omitBlacklistedHeaders({ job, decryptedHeaders })),
      map(filteredHeaders => getConditionalHeaders({ config, job, filteredHeaders })),
      mergeMap(conditionalHeaders => getCustomLogo({ reporting, config, job, conditionalHeaders })),
      mergeMap(({ logo, conditionalHeaders }) => {
        const urls = getFullUrls({ config, job });

        const { browserTimezone, layout, title } = job;
        return generatePdfObservable(
          jobLogger,
          title,
          urls,
          browserTimezone,
          conditionalHeaders,
          layout,
          logo
        );
      }),
      map(({ buffer, warnings }) => ({
        content_type: 'application/pdf',
        content: buffer.toString('base64'),
        size: buffer.byteLength,
        warnings,
      })),
      catchError(err => {
        jobLogger.error(err);
        return Rx.throwError(err);
      })
    );

    const stop$ = Rx.fromEventPattern(cancellationToken.on);
    return process$.pipe(takeUntil(stop$)).toPromise();
  };
};
