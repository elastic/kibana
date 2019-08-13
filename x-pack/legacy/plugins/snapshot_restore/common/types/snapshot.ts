/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export interface SnapshotConfig {
  indices?: string[];
  ignoreUnavailable?: boolean;
  includeGlobalState?: boolean;
  partial?: boolean;
  metadata?: {
    [key: string]: string;
  };
}

export interface SnapshotConfigEs {
  indices?: string[];
  ignore_unavailable?: boolean;
  include_global_state?: boolean;
  partial?: boolean;
  metadata?: {
    [key: string]: string;
  };
}

export interface SnapshotDetails {
  repository: string;
  snapshot: string;
  uuid: string;
  versionId: number;
  version: string;
  indices: string[];
  includeGlobalState: boolean;
  state: string;
  /** e.g. '2019-04-05T21:56:40.438Z' */
  startTime: string;
  startTimeInMillis: number;
  /** e.g. '2019-04-05T21:56:45.210Z' */
  endTime: string;
  endTimeInMillis: number;
  durationInMillis: number;
  indexFailures: any[];
  shards: SnapshotDetailsShardsStatus;
  isManagedRepository?: boolean;
  policyName?: string;
}

export interface SnapshotDetailsEs {
  snapshot: string;
  uuid: string;
  version_id: number;
  version: string;
  indices: string[];
  include_global_state: boolean;
  state: string;
  /** e.g. '2019-04-05T21:56:40.438Z' */
  start_time: string;
  start_time_in_millis: number;
  /** e.g. '2019-04-05T21:56:45.210Z' */
  end_time: string;
  end_time_in_millis: number;
  duration_in_millis: number;
  failures: any[];
  shards: SnapshotDetailsShardsStatusEs;
  metadata?: {
    policy: string;
    [key: string]: any;
  };
}

interface SnapshotDetailsShardsStatus {
  total: number;
  failed: number;
  successful: number;
}

interface SnapshotDetailsShardsStatusEs {
  total: number;
  failed: number;
  successful: number;
}
