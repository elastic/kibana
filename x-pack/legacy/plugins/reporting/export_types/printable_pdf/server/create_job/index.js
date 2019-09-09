/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PLUGIN_ID, PDF_JOB_TYPE } from '../../../../common/constants';
import { LevelLogger, oncePerServer } from '../../../../server/lib';
import { cryptoFactory } from '../../../../server/lib/crypto';
import { compatibilityShimFactory } from './compatibility_shim';

function createJobFactoryFn(server) {
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, PDF_JOB_TYPE, 'create']);
  const compatibilityShim = compatibilityShimFactory(server, logger);
  const crypto = cryptoFactory(server);

  return compatibilityShim(async function createJobFn(
    { objectType, title, relativeUrls, browserTimezone, layout },
    headers,
    request
  ) {
    const serializedEncryptedHeaders = await crypto.encrypt(headers);

    return {
      type: objectType, // Note: this changes the shape of the job params object
      title,
      objects: relativeUrls.map(u => ({ relativeUrl: u })),
      headers: serializedEncryptedHeaders,
      browserTimezone,
      layout,
      basePath: request.getBasePath(),
      forceNow: new Date().toISOString(),
    };
  });
}

export const createJobFactory = oncePerServer(createJobFactoryFn);
