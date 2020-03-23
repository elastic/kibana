/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateUrls } from '../../../../common/validate_urls';
import { ReportingCore } from '../../../../server';
import { cryptoFactory } from '../../../../server/lib/crypto';
import {
  ConditionalHeaders,
  CreateJobFactory,
  ESQueueCreateJobFn,
  RequestFacade,
  ServerFacade,
} from '../../../../types';
import { JobParamsPNG } from '../../types';

export const createJobFactory: CreateJobFactory<ESQueueCreateJobFn<
  JobParamsPNG
>> = function createJobFactoryFn(reporting: ReportingCore, server: ServerFacade) {
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
