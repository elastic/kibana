/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AgentConfiguration {
  '@timestamp': number;
  applied_by_agent?: boolean;
  etag?: string;
  agent_name?: string;
  service: {
    name?: string;
    environment?: string;
  };
  settings: {
    transaction_sample_rate?: number;
    capture_body?: string;
    transaction_max_spans?: number;
  };
}
