/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import Hapi from 'hapi';
import {
  ElasticsearchServiceSetup,
  IUiSettingsClient,
  KibanaRequest,
} from '../../../../../../../src/core/server';
import { CSV_JOB_TYPE } from '../../../common/constants';
import { ReportingCore } from '../../../server';
import { cryptoFactory } from '../../../server/lib';
import { getFieldFormats } from '../../../server/services';
import { ESQueueWorkerExecuteFn, ExecuteJobFactory, Logger, ServerFacade } from '../../../types';
import { JobDocPayloadDiscoverCsv } from '../types';
import { fieldFormatMapFactory } from './lib/field_format_map';
import { createGenerateCsv } from './lib/generate_csv';

export const executeJobFactory: ExecuteJobFactory<ESQueueWorkerExecuteFn<
  JobDocPayloadDiscoverCsv
>> = async function executeJobFactoryFn(
  reporting: ReportingCore,
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
      headers,
      basePath,
    } = job;

    const decryptHeaders = async () => {
      let decryptedHeaders;
      try {
        decryptedHeaders = await crypto.decrypt(headers);
      } catch (err) {
        logger.error(err);
        throw new Error(
          i18n.translate(
            'xpack.reporting.exportTypes.csv.executeJob.failedToDecryptReportJobDataErrorMessage',
            {
              defaultMessage: 'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
              values: { encryptionKey: 'xpack.reporting.encryptionKey', err: err.toString() },
            }
          )
        ); // prettier-ignore
      }
      return decryptedHeaders;
    };

    const fakeRequest = KibanaRequest.from({
      headers: await decryptHeaders(),
      // This is used by the spaces SavedObjectClientWrapper to determine the existing space.
      // We use the basePath from the saved job, which we'll have post spaces being implemented;
      // or we use the server base path, which uses the default space
      getBasePath: () => basePath || serverBasePath,
      path: '/',
      route: { settings: {} },
      url: { href: '/' },
      raw: { req: { url: '/' } },
    } as Hapi.Request);

    const { callAsCurrentUser } = elasticsearch.dataClient.asScoped(fakeRequest);
    const callEndpoint = (endpoint: string, clientParams = {}, options = {}) =>
      callAsCurrentUser(endpoint, clientParams, options);

    const savedObjectsClient = await reporting.getSavedObjectsClient(fakeRequest);
    const uiSettingsClient = await reporting.getUiSettingsServiceFactory(savedObjectsClient);

    const getFormatsMap = async (client: IUiSettingsClient) => {
      const fieldFormats = await getFieldFormats().fieldFormatServiceFactory(client);
      return fieldFormatMapFactory(indexPatternSavedObject, fieldFormats);
    };
    const getUiSettings = async (client: IUiSettingsClient) => {
      const [separator, quoteValues, timezone] = await Promise.all([
        client.get('csv:separator'),
        client.get('csv:quoteValues'),
        client.get('dateFormat:tz'),
      ]);

      if (timezone === 'Browser') {
        logger.warn(
          i18n.translate('xpack.reporting.exportTypes.csv.executeJob.dateFormateSetting', {
            defaultMessage: 'Kibana Advanced Setting "{dateFormatTimezone}" is set to "Browser". Dates will be formatted as UTC to avoid ambiguity.',
            values: { dateFormatTimezone: 'dateFormat:tz' }
          })
        ); // prettier-ignore
      }

      return {
        separator,
        quoteValues,
        timezone,
      };
    };

    const [formatsMap, uiSettings] = await Promise.all([
      getFormatsMap(uiSettingsClient),
      getUiSettings(uiSettingsClient),
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
