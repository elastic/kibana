/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodeCrypto from '@elastic/node-crypto';
import { ReportingConfig } from '../types';

export function cryptoFactory(config: ReportingConfig) {
  const encryptionKey = config.get('encryptionKey');
  return nodeCrypto({ encryptionKey });
}
