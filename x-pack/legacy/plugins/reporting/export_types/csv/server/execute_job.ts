/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { i18n } from '@kbn/i18n';
import { ElasticsearchServiceSetup, KibanaRequest } from '../../../../../../../src/core/server';
import { CSV_JOB_TYPE } from '../../../common/constants';
import { cryptoFactory } from '../../../server/lib';
import { ESQueueWorkerExecuteFn, ExecuteJobFactory, Logger, ServerFacade } from '../../../types';
import { JobDocPayloadDiscoverCsv } from '../types';
import { fieldFormatMapFactory } from './lib/field_format_map';
import { createGenerateCsv } from './lib/generate_csv';
import { getFieldFormats } from '../../../server/services';

export const executeJobFactory: ExecuteJobFactory<ESQueueWorkerExecuteFn<
  JobDocPayloadDiscoverCsv
>> = function executeJobFactoryFn(
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  parentLogger: Logger
) {
  const crypto = cryptoFactory(server);
  const config = server.config();
  const logger = parentLogger.clone([CSV_JOB_TYPE, 'execute-job']);
  const serverBasePath = config.get('server.basePath');

  return async function executeJob(
    jobId: string,
    job: JobDocPayloadDiscoverCsv,
    cancellationToken: any
  ) {
    const jobLogger = logger.clone([jobId]);

    const {
      searchRequest,
      fields,
      indexPatternSavedObject,
      metaFields,
      conflictedTypesFields,
      headers: serializedEncryptedHeaders,
      basePath,
    } = job;

    let decryptedHeaders;
    try {
      decryptedHeaders = await crypto.decrypt(serializedEncryptedHeaders);
    } catch (err) {
      jobLogger.error(err);
      throw new Error(
        i18n.translate(
          'xpack.reporting.exportTypes.csv.executeJob.failedToDecryptReportJobDataErrorMessage',
          {
            defaultMessage:
              'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
            values: { encryptionKey: 'xpack.reporting.encryptionKey', err: err.toString() },
          }
        )
      );
    }

    const fakeRequest = {
      headers: decryptedHeaders,
      // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
      // We use the basePath from the saved job, which we'll have post spaces being implemented;
      // or we use the server base path, which uses the default space
      getBasePath: () => basePath || serverBasePath,
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    };

    const { callAsCurrentUser } = elasticsearch.dataClient.asScoped(
      KibanaRequest.from(fakeRequest as Hapi.Request)
    );
    const callEndpoint = (endpoint: string, clientParams = {}, options = {}) => {
      return callAsCurrentUser(endpoint, clientParams, options);
    };
    const savedObjects = server.savedObjects;
    const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(
      (fakeRequest as unknown) as KibanaRequest
    );
    const uiConfig = server.uiSettingsServiceFactory({
      savedObjectsClient,
    });

    const [formatsMap, uiSettings] = await Promise.all([
      (async () => {
        const fieldFormats = await getFieldFormats().fieldFormatServiceFactory(uiConfig);
        return fieldFormatMapFactory(indexPatternSavedObject, fieldFormats);
      })(),
      (async () => {
        const [separator, quoteValues, timezone] = await Promise.all([
          uiConfig.get('csv:separator'),
          uiConfig.get('csv:quoteValues'),
          uiConfig.get('dateFormat:tz'),
        ]);

        if (timezone === 'Browser') {
          jobLogger.warn(
            `Kibana Advanced Setting "dateFormat:tz" is set to "Browser". Dates will be formatted as UTC to avoid ambiguity.`
          );
        }

        return {
          separator,
          quoteValues,
          timezone,
        };
      })(),
    ]);

    const generateCsv = createGenerateCsv(jobLogger);
    const { content, maxSizeReached, size, csvContainsFormulas } = await generateCsv({
      searchRequest,
      fields,
      metaFields,
      conflictedTypesFields,
      callEndpoint,
      cancellationToken,
      formatsMap,
      settings: {
        ...uiSettings,
        checkForFormulas: config.get('xpack.reporting.csv.checkForFormulas'),
        maxSizeBytes: config.get('xpack.reporting.csv.maxSizeBytes'),
        scroll: config.get('xpack.reporting.csv.scroll'),
      },
    });

    return {
      content_type: 'text/csv',
      content,
      max_size_reached: maxSizeReached,
      size,
      csv_contains_formulas: csvContainsFormulas,
    };
  };
};
