/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cryptoFactory } from '../../../server/lib/crypto';
import { ConditionalHeaders, ServerFacade, RequestFacade } from '../../../types';
import { JobParamsDiscoverCsv } from '../types';

export const createJobFactory = function createJobFn(server: ServerFacade) {
  const crypto = cryptoFactory(server);

  return async function createJob(
    jobParams: JobParamsDiscoverCsv,
    headers: ConditionalHeaders,
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
