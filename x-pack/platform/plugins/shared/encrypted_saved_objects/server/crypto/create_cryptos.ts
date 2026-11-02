/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nodeCrypto from '@elastic/node-crypto';
import type { Crypto } from '@elastic/node-crypto';

import type { ConfigType } from '../config';

/** The primary crypto and the decryption-only ones for rotated keys, as configured. */
export const createCryptos = (config: ConfigType) => ({
  primaryCrypto: config.encryptionKey
    ? nodeCrypto({ encryptionKey: config.encryptionKey })
    : (undefined as Crypto | undefined),
  decryptionOnlyCryptos: config.keyRotation.decryptionOnlyKeys.map((decryptionKey) =>
    nodeCrypto({ encryptionKey: decryptionKey })
  ),
});
