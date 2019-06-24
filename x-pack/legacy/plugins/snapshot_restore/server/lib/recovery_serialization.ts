/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotRecoveryShard, SnapshotRecoveryShardEs } from '../../common/types';

export const deserializeRecoveryShard = (
  esSnapshotRecoveryShard: SnapshotRecoveryShardEs
): Partial<SnapshotRecoveryShard> => {
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
    translog: { total: translogTotal, recovered: translogRecovered, percent: translogPercent },
  } = esSnapshotRecoveryShard;

  const snapshotRecoveryShard = {
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
    translogTotal,
    translogRecovered,
    translogPercent,
  };

  return Object.entries(snapshotRecoveryShard).reduce((shard: any, [key, value]) => {
    if (value !== undefined) {
      shard[key] = value;
    }
    return shard;
  }, {});
};
