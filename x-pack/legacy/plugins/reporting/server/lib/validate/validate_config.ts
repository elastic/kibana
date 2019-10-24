/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import { ServerFacade, Logger } from '../../../types';

export function validateConfig(serverFacade: ServerFacade, logger: Logger) {
  const config = serverFacade.config();

  const encryptionKey = config.get('xpack.reporting.encryptionKey');
  if (encryptionKey == null) {
    logger.warning(
      `Generating a random key for xpack.reporting.encryptionKey. To prevent pending reports from failing on restart, please set ` +
        `xpack.reporting.encryptionKey in kibana.yml`
    );

    // @ts-ignore: No set() method on KibanaConfig, just get() and has()
    config.set('xpack.reporting.encryptionKey', crypto.randomBytes(16).toString('hex')); // update config in memory to contain a usable encryption key
  }
}
