/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, PDF_JOB_TYPE } from '../../../../common/constants';
import { LevelLogger, oncePerServer } from '../../../../server/lib';
import { generatePdfObservableFactory } from '../lib/generate_pdf';
import {
  decryptJobHeaders,
  omitBlacklistedHeaders,
  getConditionalHeaders,
  getFullUrls,
  getCustomLogo,
} from '../../../common/execute_job/';

function executeJobFn(server) {
  const generatePdfObservable = generatePdfObservableFactory(server);
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, PDF_JOB_TYPE, 'execute']);

  return function executeJob(jobId, jobToExecute, cancellationToken) {
    const jobLogger = logger.clone([jobId]);

    const process$ = Rx.of({ job: jobToExecute, server }).pipe(
      mergeMap(decryptJobHeaders),
      catchError(err => {
        jobLogger.error(err);
        return Rx.throwError(
          i18n.translate(
            'xpack.reporting.exportTypes.printablePdf.compShim.failedToDecryptReportJobDataErrorMessage',
            {
              defaultMessage:
                'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
              values: { encryptionKey: 'xpack.reporting.encryptionKey', err: err.toString() },
            }
          )
        );
      }),
      map(omitBlacklistedHeaders),
      map(getConditionalHeaders),
      mergeMap(getCustomLogo),
      mergeMap(getFullUrls),
      mergeMap(({ job, conditionalHeaders, logo, urls }) => {
        return generatePdfObservable(
          jobLogger,
          job.title,
          urls,
          job.browserTimezone,
          conditionalHeaders,
          job.layout,
          logo
        );
      }),
      map(buffer => ({
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
}

export const executeJobFactory = oncePerServer(executeJobFn);
