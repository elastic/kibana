/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';

import { SnapshotDetails, SnapshotDetailsEs, SnapshotConfig, SnapshotConfigEs } from '../types';

export function deserializeSnapshotDetails(
  repository: string,
  snapshotDetailsEs: SnapshotDetailsEs,
  managedRepository?: string
): SnapshotDetails {
  if (!snapshotDetailsEs || typeof snapshotDetailsEs !== 'object') {
    throw new Error('Unable to deserialize snapshot details');
  }

  const {
    snapshot,
    uuid,
    version_id: versionId,
    version,
    indices = [],
    include_global_state: includeGlobalState,
    state,
    start_time: startTime,
    start_time_in_millis: startTimeInMillis,
    end_time: endTime,
    end_time_in_millis: endTimeInMillis,
    duration_in_millis: durationInMillis,
    failures = [],
    shards,
    metadata: { policy: policyName } = { policy: undefined },
  } = snapshotDetailsEs;

  // If an index has multiple failures, we'll want to see them grouped together.
  const indexToFailuresMap = failures.reduce((map, failure) => {
    const { index, ...rest } = failure;
    if (!map[index]) {
      map[index] = {
        index,
        failures: [],
      };
    }

    map[index].failures.push(rest);
    return map;
  }, {});

  // Sort all failures by their shard.
  Object.keys(indexToFailuresMap).forEach(index => {
    indexToFailuresMap[index].failures = sortBy(
      indexToFailuresMap[index].failures,
      ({ shard }) => shard
    );
  });

  // Sort by index name.
  const indexFailures = sortBy(Object.values(indexToFailuresMap), ({ index }) => index);

  const snapshotDetails: SnapshotDetails = {
    repository,
    snapshot,
    uuid,
    versionId,
    version,
    indices: [...indices].sort(),
    includeGlobalState,
    state,
    startTime,
    startTimeInMillis,
    endTime,
    endTimeInMillis,
    durationInMillis,
    indexFailures,
    shards,
    isManagedRepository: repository === managedRepository,
  };

  if (policyName) {
    snapshotDetails.policyName = policyName;
  }
  return snapshotDetails;
}

export function deserializeSnapshotConfig(snapshotConfigEs: SnapshotConfigEs): SnapshotConfig {
  const {
    indices,
    ignore_unavailable: ignoreUnavailable,
    include_global_state: includeGlobalState,
    partial,
    metadata,
  } = snapshotConfigEs;

  const snapshotConfig: SnapshotConfig = {
    indices,
    ignoreUnavailable,
    includeGlobalState,
    partial,
    metadata,
  };

  return Object.entries(snapshotConfig).reduce((config: any, [key, value]) => {
    if (value !== undefined) {
      config[key] = value;
    }
    return config;
  }, {});
}

export function serializeSnapshotConfig(snapshotConfig: SnapshotConfig): SnapshotConfigEs {
  const { indices, ignoreUnavailable, includeGlobalState, partial, metadata } = snapshotConfig;

  const snapshotConfigEs: SnapshotConfigEs = {
    indices,
    ignore_unavailable: ignoreUnavailable,
    include_global_state: includeGlobalState,
    partial,
    metadata,
  };

  return Object.entries(snapshotConfigEs).reduce((config: any, [key, value]) => {
    if (value !== undefined) {
      config[key] = value;
    }
    return config;
  }, {});
}
