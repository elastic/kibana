/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { KbnServer, ConditionalHeaders } from '../../../../types';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { oncePerServer } from '../../../../server/lib/once_per_server';
import { JobParamsPNG as JobParams, CreateJobFactoryPNG as CreateJobFactory } from '../../types';

function createJobFn(server: KbnServer) {
  const crypto = cryptoFactory(server);

  return async function createJob(
    { objectType, title, relativeUrl, browserTimezone, layout }: JobParams,
    headers: ConditionalHeaders,
    request: Request
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(headers);

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
}

export const createJobFactory: CreateJobFactory = oncePerServer(createJobFn as CreateJobFactory);
