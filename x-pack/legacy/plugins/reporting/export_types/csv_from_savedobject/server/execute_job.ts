/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchServiceSetup } from 'kibana/server';
import { CONTENT_TYPE_CSV, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../common/constants';
import { ReportingCore } from '../../../server';
import { cryptoFactory } from '../../../server/lib';
import {
  ExecuteJobFactory,
  ImmediateExecuteFn,
  JobDocOutput,
  Logger,
  RequestFacade,
  ServerFacade,
} from '../../../types';
import { CsvResultFromSearch } from '../../csv/types';
import { FakeRequest, JobDocPayloadPanelCsv, JobParamsPanelCsv, SearchPanel } from '../types';
import { createGenerateCsv } from './lib';

export const executeJobFactory: ExecuteJobFactory<ImmediateExecuteFn<
  JobParamsPanelCsv
>> = async function executeJobFactoryFn(
  reporting: ReportingCore,
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  parentLogger: Logger
) {
  const crypto = cryptoFactory(server);
  const logger = parentLogger.clone([CSV_FROM_SAVEDOBJECT_JOB_TYPE, 'execute-job']);
  const generateCsv = createGenerateCsv(reporting, server, elasticsearch, parentLogger);

  return async function executeJob(
    jobId: string | null,
    job: JobDocPayloadPanelCsv,
    realRequest?: RequestFacade
  ): Promise<JobDocOutput> {
    // There will not be a jobID for "immediate" generation.
    // jobID is only for "queued" jobs
    // Use the jobID as a logging tag or "immediate"
    const jobLogger = logger.clone([jobId === null ? 'immediate' : jobId]);

    const { jobParams } = job;
    const { isImmediate, panel, visType } = jobParams as JobParamsPanelCsv & { panel: SearchPanel };

    if (!panel) {
      i18n.translate(
        'xpack.reporting.exportTypes.csv_from_savedobject.executeJob.failedToAccessPanel',
        { defaultMessage: 'Failed to access panel metadata for job execution' }
      );
    }

    jobLogger.debug(`Execute job generating [${visType}] csv`);

    let requestObject: RequestFacade | FakeRequest;
    if (isImmediate && realRequest) {
      jobLogger.info(`Executing job from immediate API`);
      requestObject = realRequest;
    } else {
      jobLogger.info(`Executing job async using encrypted headers`);
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
        server,
      };
    }

    let content: string;
    let maxSizeReached = false;
    let size = 0;
    try {
      const generateResults: CsvResultFromSearch = await generateCsv(
        requestObject,
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
};
