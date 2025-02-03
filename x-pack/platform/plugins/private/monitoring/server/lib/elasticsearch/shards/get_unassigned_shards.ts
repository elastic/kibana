/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Methods for calculating metrics for
// - Number of Primary Shards
// - Number of Replica Shards
// - Unassigned Primary Shards
// - Unassigned Replica Shards
export function getUnassignedShards(indexShardStats: {
  unassigned: { primary: number; replica: number };
}) {
  let unassignedShards = 0;

  unassignedShards += indexShardStats.unassigned.primary;
  unassignedShards += indexShardStats.unassigned.replica;

  return unassignedShards;
}
