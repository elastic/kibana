/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cryptoFactory } from '../../../../server/lib/crypto';
import { oncePerServer } from '../../../../server/lib/once_per_server';

function createJobFn(server) {
  const crypto = cryptoFactory(server);

  return async function createJob({
    objectType,
    title,
    relativeUrl,
    browserTimezone,
    layout
  }, headers, request) {
    const serializedEncryptedHeaders = await crypto.encrypt(headers);

    return {
      type: objectType,
      title: title,
      relativeUrl,
      headers: serializedEncryptedHeaders,
      browserTimezone,
      layout,
      basePath: request.getBasePath(),
      forceNow: new Date().toISOString(),
    };
  };
}

export const createJobFactory = oncePerServer(createJobFn);
