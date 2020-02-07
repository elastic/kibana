/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CreateJobFactory,
  ESQueueCreateJobFn,
  ServerFacade,
  RequestFacade,
  ConditionalHeaders,
} from '../../../../types';
import { validateUrls } from '../../../../common/validate_urls';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { JobParamsPDF } from '../../types';

export const createJobFactory: CreateJobFactory<ESQueueCreateJobFn<
  JobParamsPDF
>> = function createJobFactoryFn(server: ServerFacade) {
  const crypto = cryptoFactory(server);

  return async function createJobFn(
    { title, relativeUrls, browserTimezone, layout, objectType }: JobParamsPDF,
    headers: ConditionalHeaders['headers'],
    request: RequestFacade
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(headers);

    validateUrls(relativeUrls);

    return {
      basePath: request.getBasePath(),
      browserTimezone,
      forceNow: new Date().toISOString(),
      headers: serializedEncryptedHeaders,
      layout,
      relativeUrls,
      title,
      objectType,
    };
  };
};
