/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
}

interface SnapshotDetailsShardsStatusEs {
  total: number;
  failed: number;
  successful: number;
}
