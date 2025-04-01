/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface LogsOsqueryAction {
  '@timestamp': string;
  action_id: string;
  alert_ids: string | string[];
  agents: string | string[];
  expiration: string;
  input_type: 'osquery';
  queries: Record<string, unknown>;
  type: 'INPUT_ACTION';
}
