/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import stringify from 'safe-stable-stringify';

const stableStringify = stringify.configure({
  deterministic: true,
  circularValue: undefined,
  strict: true,
});

export const computeMappingHash = (mappings: Record<string, unknown>): string => {
  const stable = stableStringify(mappings);
  return createHash('sha256').update(stable).digest('hex');
};
