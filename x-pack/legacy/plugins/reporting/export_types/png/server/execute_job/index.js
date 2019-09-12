/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { i18n } from '@kbn/i18n';
import { mergeMap, catchError, map, takeUntil } from 'rxjs/operators';
import { PLUGIN_ID, PNG_JOB_TYPE } from '../../../../common/constants';
import { LevelLogger, oncePerServer } from '../../../../server/lib';
import { generatePngObservableFactory } from '../lib/generate_png';
import {
  decryptJobHeaders,
  omitBlacklistedHeaders,
  getConditionalHeaders,
  getFullUrls,
} from '../../../common/execute_job/';

function executeJobFn(server) {
  const generatePngObservable = generatePngObservableFactory(server);
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, PNG_JOB_TYPE, 'execute']);

  return function executeJob(jobId, jobToExecute, cancellationToken) {
    const jobLogger = logger.clone([jobId]);
    const process$ = Rx.of({ job: jobToExecute, server }).pipe(
      mergeMap(decryptJobHeaders),
      catchError(err => {
        jobLogger.error(err);
        return Rx.throwError(
          i18n.translate(
            'xpack.reporting.exportTypes.png.compShim.failedToDecryptReportJobDataErrorMessage',
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
      mergeMap(getFullUrls),
      mergeMap(({ job, conditionalHeaders, urls }) => {
        const hashUrl = urls[0];
        return generatePngObservable(
          jobLogger,
          hashUrl,
          job.browserTimezone,
          conditionalHeaders,
          job.layout // was this mutated in from somewhere? It has not been sanity checked. See x-pack/legacy/plugins/reporting/export_types/png/server/lib/generate_png.ts line 52
        );
      }),
      map(buffer => ({
        content_type: 'image/png',
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
