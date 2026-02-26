/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { v5 } from 'uuid';

export function computeRuleId(assetUuid: string, query: string): string {
  const queryHash = objectHash([assetUuid, query]);
  return v5(queryHash, v5.DNS);
}
