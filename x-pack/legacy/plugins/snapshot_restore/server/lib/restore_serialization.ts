/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotRestoreShard, SnapshotRestoreShardEs } from '../../common/types';

export const deserializeRestoreShard = (
  esSnapshotRestoreShard: SnapshotRestoreShardEs
): Partial<SnapshotRestoreShard> => {
  const {
    id,
    primary,
    stage,
    source: { repository, snapshot, version },
    target: { host: targetHost, name: targetNode },
    start_time: startTime,
    start_time_in_millis: startTimeInMillis,
    stop_time: stopTime,
    stop_time_in_millis: stopTimeInMillis,
    total_time: totalTime,
    total_time_in_millis: totalTimeInMillis,
    index: {
      size: {
        total_in_bytes: bytesTotal,
        recovered_in_bytes: bytesRecovered,
        percent: bytesPercent,
      },
      files: { total: filesTotal, recovered: filesRecovered, percent: filesPercent },
    },
  } = esSnapshotRestoreShard;

  const snapshotRestoreShard = {
    id,
    primary,
    stage,
    snapshot,
    repository,
    version,
    targetHost,
    targetNode,
    startTime,
    startTimeInMillis,
    stopTime,
    stopTimeInMillis,
    totalTime,
    totalTimeInMillis,
    bytesTotal,
    bytesRecovered,
    bytesPercent,
    filesTotal,
    filesRecovered,
    filesPercent,
  };

  return Object.entries(snapshotRestoreShard).reduce((shard: any, [key, value]) => {
    if (value !== undefined) {
      shard[key] = value;
    }
    return shard;
  }, {});
};
