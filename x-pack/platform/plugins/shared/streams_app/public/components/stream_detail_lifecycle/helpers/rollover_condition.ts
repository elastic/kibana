/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmPolicyHotPhase } from '@kbn/streams-schema';

export function rolloverCondition(rollover?: IlmPolicyHotPhase['rollover']) {
  const conditions = [
    rollover?.max_age && 'max age ' + rollover.max_age,
    rollover?.max_docs && 'max docs ' + rollover.max_docs,
    rollover?.max_primary_shard_docs && 'primary shard docs ' + rollover.max_primary_shard_docs,
    rollover?.max_primary_shard_size && 'primary shard size ' + rollover.max_primary_shard_size,
    rollover?.max_size && 'index size ' + rollover.max_size,
  ].filter(Boolean);
  return conditions.join(' or ');
}
