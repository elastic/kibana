/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../../../server';
import { cryptoFactory } from '../../../server/lib';
import {
  ConditionalHeaders,
  CreateJobFactory,
  ESQueueCreateJobFn,
  RequestFacade,
} from '../../../server/types';
import { JobParamsDiscoverCsv } from '../types';

export const createJobFactory: CreateJobFactory<ESQueueCreateJobFn<
  JobParamsDiscoverCsv
>> = function createJobFactoryFn(reporting: ReportingCore) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));

  return async function createJob(
    jobParams: JobParamsDiscoverCsv,
    headers: ConditionalHeaders['headers'],
    request: RequestFacade
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(headers);

    const savedObjectsClient = request.getSavedObjectsClient();
    const indexPatternSavedObject = await savedObjectsClient.get(
      'index-pattern',
      jobParams.indexPatternId!
    );

    return {
      headers: serializedEncryptedHeaders,
      indexPatternSavedObject,
      basePath: request.getBasePath(),
      ...jobParams,
    };
  };
};
