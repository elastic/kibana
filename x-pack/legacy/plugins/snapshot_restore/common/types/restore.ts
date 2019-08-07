/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface RestoreSettings {
  indices?: string[] | string;
  renamePattern?: string;
  renameReplacement?: string;
  includeGlobalState?: boolean;
  partial?: boolean;
  indexSettings?: string;
  ignoreIndexSettings?: string[];
  ignoreUnavailable?: boolean;
}

export interface RestoreSettingsEs {
  indices?: string[] | string;
  rename_pattern?: string;
  rename_replacement?: string;
  include_global_state?: boolean;
  partial?: boolean;
  index_settings?: { [key: string]: any };
  ignore_index_settings?: string[];
  ignore_unavailable?: boolean;
}

export interface SnapshotRestore {
  index: string;
  latestActivityTimeInMillis: number;
  shards: Array<Partial<SnapshotRestoreShard>>;
  isComplete: boolean;
}

export interface SnapshotRestoreShard {
  id: number;
  primary: boolean;
  stage: string;
  snapshot: string;
  repository: string;
  version: string;

  targetHost: string;
  targetNode: string;

  /** e.g. '2019-04-05T21:56:40.438Z' */
  startTime: string;
  startTimeInMillis: number;
  /** e.g. '2019-04-05T21:56:40.438Z' */
  stopTime: string;
  stopTimeInMillis: number;
  totalTime: string;
  totalTimeInMillis: number;

  bytesTotal: number;
  bytesRecovered: number;
  bytesPercent: string;

  filesTotal: number;
  filesRecovered: number;
  filesPercent: string;
}

export interface SnapshotRestoreShardEs {
  id: number;
  type: string;
  stage: string;
  primary: boolean;
  /** e.g. '2019-04-05T21:56:40.438Z' */
  start_time: string;
  start_time_in_millis: number;
  /** e.g. '2019-04-05T21:56:40.438Z' */
  stop_time: string;
  stop_time_in_millis: number;
  total_time: string;
  total_time_in_millis: number;
  source: {
    repository: string;
    snapshot: string;
    version: string;
    index: string;
    restoreUUID: string;
  };
  target: {
    id: string;
    host: string;
    transport_address: string;
    ip: string;
    name: string;
  };
  index: {
    size: {
      total: string;
      total_in_bytes: number;
      reused: string;
      reused_in_bytes: number;
      recovered: string;
      recovered_in_bytes: number;
      percent: string;
    };
    files: {
      total: number;
      reused: number;
      recovered: number;
      percent: string;
    };
    total_time: string;
    total_time_in_millis: number;
    source_throttle_time: string;
    source_throttle_time_in_millis: number;
    target_throttle_time: string;
    target_throttle_time_in_millis: number;
  };
  translog: {
    recovered: number;
    total: number;
    percent: string;
    total_on_start: number;
    total_time: string;
    total_time_in_millis: number;
  };
  verify_index: {
    check_index_time: string;
    check_index_time_in_millis: number;
    total_time: string;
    total_time_in_millis: number;
  };
}
