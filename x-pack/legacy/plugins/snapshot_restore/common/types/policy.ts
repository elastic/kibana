/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RestoreSettings, RestoreSettingsEs } from './restore';

export interface SlmPolicy {
  name: string;
  version: number;
  modifiedDate: string;
  modifiedDateMillis: number;
  snapshotName: string;
  schedule: string;
  repository: string;
  config: RestoreSettings;
  nextExecution: string;
  nextExecutionMillis: number;
  lastSuccess?: {
    snapshotName: string;
    timeString: string;
    time: number;
  };
  lastFailure?: {
    snapshotName: string;
    timeString: string;
    time: number;
    details: object | string;
  };
}

export interface SlmPolicyEs {
  version: number;
  modified_date: string;
  modified_date_millis: number;
  policy: {
    name: string;
    schedule: string;
    repository: string;
    config: RestoreSettingsEs;
  };
  next_execution: string;
  next_execution_millis: number;
  last_success?: {
    snapshot_name: string;
    time_string: string;
    time: number;
  };
  last_failure?: {
    snapshot_name: string;
    time_string: string;
    time: number;
    details: string;
  };
}
