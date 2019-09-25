/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import { oncePerServer } from '../../../server/lib/once_per_server';
import { cryptoFactory } from '../../../server/lib/crypto';
import { KbnServer, ConditionalHeaders, CreateJobFactory } from '../../../types';
import { JobParamsDiscoverCsv, ESQueueCreateJobFnDiscoverCsv } from '../types';

function createJobFn(server: KbnServer) {
  const crypto = cryptoFactory(server);

  return async function createJob(
    jobParams: JobParamsDiscoverCsv,
    headers: ConditionalHeaders,
    request: Request
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
}

export const createJobFactory: CreateJobFactory = oncePerServer(createJobFn as (
  server: KbnServer
) => ESQueueCreateJobFnDiscoverCsv);
