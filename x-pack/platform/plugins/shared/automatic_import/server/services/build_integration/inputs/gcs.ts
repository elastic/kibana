/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats gcs (Google Cloud Storage) input Go config:
 * https://github.com/elastic/beats/blob/main/x-pack/filebeat/input/gcs/config.go
 */

export interface GcsReaderConfig {
  parsers?: Array<Record<string, unknown>>;
  decoding?: Record<string, unknown>;
  content_type?: string;
  encoding?: string;
  override_content_type?: boolean;
  override_encoding?: boolean;
}

export interface GcsFileSelectorConfig {
  regex: string;
}

export interface GcsFileCredentialsConfig {
  path: string;
}

export interface GcsJsonCredentialsConfig {
  account_key: string;
}

export interface GcsAuthConfig {
  credentials_file?: GcsFileCredentialsConfig;
  credentials_json?: GcsJsonCredentialsConfig;
}

export interface GcsRetryConfig {
  max_attempts?: number;
  initial_backoff_duration?: string;
  max_backoff_duration?: string;
  backoff_multiplier?: number;
}

export interface GcsBucketConfig {
  name: string;
  batch_size?: number;
  max_workers?: number;
  poll?: boolean;
  poll_interval?: string;
  parse_json?: boolean;
  file_selectors?: GcsFileSelectorConfig[];
  timestamp_epoch?: number;
  expand_event_list_from_field?: string;
  parsers?: Array<Record<string, unknown>>;
  decoding?: Record<string, unknown>;
  content_type?: string;
  encoding?: string;
  override_content_type?: boolean;
  override_encoding?: boolean;
}

export interface GcsInputConfig extends GcsReaderConfig {
  project_id: string;
  auth?: GcsAuthConfig;
  batch_size?: number;
  max_workers?: number;
  poll?: boolean;
  poll_interval?: string;
  parse_json?: boolean;
  buckets: GcsBucketConfig[];
  file_selectors?: GcsFileSelectorConfig[];
  timestamp_epoch?: number;
  expand_event_list_from_field?: string;
  alternative_host?: string;
  retry?: GcsRetryConfig;

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
