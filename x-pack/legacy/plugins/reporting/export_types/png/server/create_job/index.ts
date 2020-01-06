/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CreateJobFactory,
  ServerFacade,
  RequestFacade,
  ESQueueCreateJobFn,
  ConditionalHeaders,
} from '../../../../types';
import { validateUrls } from '../../../../common/validate_urls';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { JobParamsPNG } from '../../types';

export const createJobFactory: CreateJobFactory<ESQueueCreateJobFn<
  JobParamsPNG
>> = function createJobFactoryFn(server: ServerFacade) {
  const crypto = cryptoFactory(server);

  return async function createJob(
    { objectType, title, relativeUrl, browserTimezone, layout }: JobParamsPNG,
    headers: ConditionalHeaders['headers'],
    request: RequestFacade
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(headers);

    validateUrls([relativeUrl]);

    return {
      objectType,
      title,
      relativeUrl,
      headers: serializedEncryptedHeaders,
      browserTimezone,
      layout,
      basePath: request.getBasePath(),
      forceNow: new Date().toISOString(),
    };
  };
};
