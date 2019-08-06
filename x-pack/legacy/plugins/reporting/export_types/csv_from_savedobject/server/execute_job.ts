/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { i18n } from '@kbn/i18n';

import { cryptoFactory, LevelLogger as Logger, oncePerServer } from '../../../server/lib';
import { JobDocOutputExecuted, JobDocPayload, KbnServer } from '../../../types';
import {
  CONTENT_TYPE_CSV,
  CSV_FROM_SAVEDOBJECT_JOB_TYPE,
  PLUGIN_ID,
} from '../../../common/constants';
import { CsvResultFromSearch, createGenerateCsv } from './lib';

interface FakeRequest {
  headers: any;
  getBasePath: (opts: any) => string;
  server: KbnServer;
}

type ExecuteJobFn = (
  jobId: string | null,
  job: JobDocPayload,
  realRequest?: Request
) => Promise<JobDocOutputExecuted>;

function executeJobFactoryFn(server: KbnServer): ExecuteJobFn {
  const crypto = cryptoFactory(server);
  const config = server.config();
  const serverBasePath = config.get('server.basePath');
  const logger = Logger.createForServer(server, [
    PLUGIN_ID,
    CSV_FROM_SAVEDOBJECT_JOB_TYPE,
    'execute-job',
  ]);
  const generateCsv = createGenerateCsv(logger);

  return async function executeJob(
    jobId: string | null,
    job: JobDocPayload,
    realRequest?: Request
  ): Promise<JobDocOutputExecuted> {
    // if job is immediate, there will not be a jobId
    const jobLogger = jobId == null ? logger : logger.clone([jobId]);

    const { basePath, jobParams } = job;
    const { isImmediate, panel, visType } = jobParams;

    jobLogger.debug(`Execute job generating [${visType}] csv`);

    let requestObject: Request | FakeRequest;
    if (isImmediate && realRequest) {
      logger.info(`Executing job from immediate API`);
      requestObject = realRequest;
    } else {
      logger.info(`Executing job async using encrypted headers`);
      let decryptedHeaders;
      const serializedEncryptedHeaders = job.headers;
      try {
        decryptedHeaders = await crypto.decrypt(serializedEncryptedHeaders);
      } catch (err) {
        jobLogger.error(err);
        throw new Error(
          i18n.translate(
            'xpack.reporting.exportTypes.csv_from_savedobject.executeJob.failedToDecryptReportJobDataErrorMessage',
            {
              defaultMessage:
                'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
              values: { encryptionKey: 'xpack.reporting.encryptionKey', err },
            }
          )
        );
      }

      requestObject = {
        headers: decryptedHeaders,
        getBasePath: () => basePath || serverBasePath,
        server,
      };
    }

    let content: string;
    let maxSizeReached = false;
    let size = 0;
    try {
      const generateResults: CsvResultFromSearch = await generateCsv(
        requestObject,
        server,
        visType as string,
        panel,
        jobParams
      );

      ({
        result: { content, maxSizeReached, size },
      } = generateResults);
    } catch (err) {
      jobLogger.error(`Generate CSV Error! ${err}`);
      throw err;
    }

    if (maxSizeReached) {
      jobLogger.warn(`Max size reached: CSV output truncated to ${size} bytes`);
    }

    return {
      content_type: CONTENT_TYPE_CSV,
      content,
      max_size_reached: maxSizeReached,
      size,
    };
  };
}

export const executeJobFactory = oncePerServer(executeJobFactoryFn);
