/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import stringify from 'json-stable-stringify';

export class CryptoService {
  public getHash(payload: string): string {
    const hash = createHash('sha256');

    hash.update(payload);
    return hash.digest('hex');
  }

  public stringifyDeterministically(obj?: Record<string, unknown>): string | null {
    if (obj == null) {
      return null;
    }

    return stringify(obj);
  }
}
