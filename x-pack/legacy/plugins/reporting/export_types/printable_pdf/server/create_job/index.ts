/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateUrls } from '../../../../common/validate_urls';
import { cryptoFactory } from '../../../../server/lib';
import {
  ConditionalHeaders,
  CreateJobFactory,
  ESQueueCreateJobFn,
  RequestFacade,
} from '../../../../server/types';
import { JobParamsPDF } from '../../types';
// @ts-ignore untyped module
import { compatibilityShimFactory } from './compatibility_shim';

interface CreateJobFnOpts {
  objectType: any;
  title: string;
  relativeUrls: string[];
  browserTimezone: string;
  layout: any;
}

export const createJobFactory: CreateJobFactory<ESQueueCreateJobFn<
  JobParamsPDF
>> = function createJobFactoryFn(reporting, logger) {
  const config = reporting.getConfig();
  const crypto = cryptoFactory(config.get('encryptionKey'));
  const compatibilityShim = compatibilityShimFactory(reporting, logger);

  return compatibilityShim(async function createJobFn(
    { objectType, title, relativeUrls, browserTimezone, layout }: CreateJobFnOpts,
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
      objects: relativeUrls.map((u) => ({ relativeUrl: u })),
      title,
      type: objectType, // Note: this changes the shape of the job params object
    };
  });
};
