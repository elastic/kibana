/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RestoreSettings, RestoreSettingsEs } from './restore';

export interface SlmPolicy {
  name: string;
  version: number;
  modifiedDateMillis: number;
  snapshotName: string;
  schedule: string;
  repository: string;
  config: RestoreSettings;
  nextExecutionMillis: number;
}

export interface SlmPolicyEs {
  version: number;
  modified_date_millis: number;
  policy: {
    name: string;
    schedule: string;
    repository: string;
    config: RestoreSettingsEs;
  };
  next_execution_millis: number;
}
