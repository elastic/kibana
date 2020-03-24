/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import crypto from 'crypto';
import { ServerFacade, Logger } from '../../../types';

export function validateEncryptionKey(serverFacade: ServerFacade, logger: Logger) {
  const config = serverFacade.config();

  const encryptionKey = config.get('xpack.reporting.encryptionKey');
  if (encryptionKey == null) {
    // TODO this should simply throw an error and let the handler conver it to a warning mesasge. See validateServerHost.
    logger.warning(
      i18n.translate('xpack.reporting.selfCheckEncryptionKey.warning', {
        defaultMessage:
          `Generating a random key for {setting}. To prevent pending reports ` +
          `from failing on restart, please set {setting} in kibana.yml`,
        values: {
          setting: 'xpack.reporting.encryptionKey',
        },
      })
    );

    // @ts-ignore: No set() method on KibanaConfig, just get() and has()
    config.set('xpack.reporting.encryptionKey', crypto.randomBytes(16).toString('hex')); // update config in memory to contain a usable encryption key
  }
}
