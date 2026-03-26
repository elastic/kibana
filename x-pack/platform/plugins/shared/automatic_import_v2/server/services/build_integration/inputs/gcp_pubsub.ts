/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats gcp-pubsub input Go config:
 * https://github.com/elastic/beats/blob/main/x-pack/filebeat/input/gcppubsub/config.go
 */

export interface GcpPubsubSubscriptionConfig {
  name: string;
  num_goroutines?: number;
  max_outstanding_messages?: number;
  create?: boolean;
}

export interface GcpPubsubInputConfig {
  project_id: string;
  topic: string;
  subscription: GcpPubsubSubscriptionConfig;
  credentials_file?: string;
  credentials_json?: string;
  alternative_host?: string;

  proxy_url?: string;
  proxy_disable?: boolean;

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
