/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodeCrypto from '@elastic/node-crypto';
import { oncePerServer } from './once_per_server';
import { ServerFacade } from '../../types';

function cryptoFn(server: ServerFacade) {
  const encryptionKey = server.config().get('xpack.reporting.encryptionKey');
  if (typeof encryptionKey !== 'string') {
    throw new Error('Encryption Key required.');
  }

  return nodeCrypto({ encryptionKey });
}

export const cryptoFactory = oncePerServer(cryptoFn);
