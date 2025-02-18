/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random, memoize } from 'lodash';
const bytes: Record<string, number> = {};
export const generateBytesProcessed = memoize(
  (_timestamp: string, host: string, start = 1000, end = 100000) => {
    if (!bytes[host]) {
      bytes[host] = 0;
    }
    const newBytes = random(start, end);
    bytes[host] =
      newBytes + bytes[host] > Number.MAX_SAFE_INTEGER ? newBytes : newBytes + bytes[host];
    return bytes[host];
  }
);
