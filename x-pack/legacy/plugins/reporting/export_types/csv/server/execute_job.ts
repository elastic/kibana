/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ExecuteJobFactory, ESQueueWorkerExecuteFn, ServerFacade } from '../../../types';
import { CSV_JOB_TYPE, PLUGIN_ID } from '../../../common/constants';
import { cryptoFactory, LevelLogger } from '../../../server/lib';
import { JobDocPayloadDiscoverCsv } from '../types';
// @ts-ignore untyped module TODO
import { createGenerateCsv } from './lib/generate_csv';
// @ts-ignore untyped module TODO
import { fieldFormatMapFactory } from './lib/field_format_map';

export const executeJobFactory: ExecuteJobFactory<ESQueueWorkerExecuteFn<
  JobDocPayloadDiscoverCsv
>> = function executeJobFactoryFn(server: ServerFacade) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const crypto = cryptoFactory(server);
  const config = server.config();
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, CSV_JOB_TYPE, 'execute-job']);
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

    const callEndpoint = (endpoint: string, clientParams = {}, options = {}) => {
      return callWithRequest(fakeRequest, endpoint, clientParams, options);
    };
    const savedObjects = server.savedObjects;
    const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(fakeRequest);
    const uiConfig = server.uiSettingsServiceFactory({
      savedObjectsClient,
    });

    const [formatsMap, uiSettings] = await Promise.all([
      (async () => {
        // @ts-ignore fieldFormatServiceFactory' does not exist on type 'ServerFacade TODO
        const fieldFormats = await server.fieldFormatServiceFactory(uiConfig);
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
