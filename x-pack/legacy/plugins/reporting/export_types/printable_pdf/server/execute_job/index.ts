/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { ElasticsearchServiceSetup } from 'kibana/server';
import { catchError, map, mergeMap, takeUntil } from 'rxjs/operators';
import { ReportingCore } from '../../../../server';
import { ServerFacade, ExecuteJobFactory, ESQueueWorkerExecuteFn, Logger } from '../../../../types';
import { JobDocPayloadPDF } from '../../types';
import { PDF_JOB_TYPE } from '../../../../common/constants';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import {
  decryptJobHeaders,
  omitBlacklistedHeaders,
  getConditionalHeaders,
  getFullUrls,
  getCustomLogo,
} from '../../../common/execute_job/';

type QueuedPdfExecutorFactory = ExecuteJobFactory<ESQueueWorkerExecuteFn<JobDocPayloadPDF>>;

export const executeJobFactory: QueuedPdfExecutorFactory = async function executeJobFactoryFn(
  reporting: ReportingCore,
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  parentLogger: Logger
) {
  const browserDriverFactory = await reporting.getBrowserDriverFactory();
  const generatePdfObservable = generatePdfObservableFactory(server, browserDriverFactory);
  const logger = parentLogger.clone([PDF_JOB_TYPE, 'execute']);

  return function executeJob(jobId: string, job: JobDocPayloadPDF, cancellationToken: any) {
    const jobLogger = logger.clone([jobId]);

    const process$ = Rx.of(1).pipe(
      mergeMap(() => decryptJobHeaders({ server, job, logger })),
      map(decryptedHeaders => omitBlacklistedHeaders({ job, decryptedHeaders })),
      map(filteredHeaders => getConditionalHeaders({ server, job, filteredHeaders })),
      mergeMap(conditionalHeaders => getCustomLogo({ reporting, server, job, conditionalHeaders })),
      mergeMap(({ logo, conditionalHeaders }) => {
        const urls = getFullUrls({ server, job });

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
      map((buffer: Buffer) => ({
        content_type: 'application/pdf',
        content: buffer.toString('base64'),
        size: buffer.byteLength,
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
