/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import { v5 } from 'uuid';

/**
 * Compute a deterministic rule id for a query knowledge indicator.
 *
 * The legacy implementation hashed `(asset_uuid, esql)`. With the unified
 * KI data stream `asset.uuid` no longer exists, so the input is now
 * `(stream.name, query.id, esql)`. This is a clean break: rule ids
 * generated against the legacy storage will not collide with new rule ids,
 * which is acceptable because the legacy indices are not migrated.
 */
export function computeRuleId(streamName: string, queryId: string, esqlQuery: string): string {
  const queryHash = objectHash([streamName, queryId, esqlQuery]);
  return v5(queryHash, v5.DNS);
}
