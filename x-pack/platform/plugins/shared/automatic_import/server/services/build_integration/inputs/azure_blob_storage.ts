/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats azure-blob-storage input Go config:
 * https://github.com/elastic/beats/blob/main/x-pack/filebeat/input/azureblobstorage/config.go
 */

export interface AzureBlobStorageReaderConfig {
  parsers?: Array<Record<string, unknown>>;
  decoding?: Record<string, unknown>;
  content_type?: string;
  encoding?: string;
  override_content_type?: boolean;
  override_encoding?: boolean;
}

export interface AzureBlobStorageFileSelectorConfig {
  regex: string;
}

export interface AzureBlobStorageSharedKeyConfig {
  account_key: string;
}

export interface AzureBlobStorageConnectionStringConfig {
  uri: string;
}

export interface AzureBlobStorageOAuth2Config {
  client_id: string;
  client_secret: string;
  tenant_id: string;
}

export interface AzureBlobStorageAuthConfig {
  shared_credentials?: AzureBlobStorageSharedKeyConfig;
  connection_string?: AzureBlobStorageConnectionStringConfig;
  oauth2?: AzureBlobStorageOAuth2Config;
}

export interface AzureBlobStorageContainerConfig {
  name: string;
  batch_size?: number;
  max_workers?: number;
  poll?: boolean;
  poll_interval?: string;
  file_selectors?: AzureBlobStorageFileSelectorConfig[];
  timestamp_epoch?: number;
  expand_event_list_from_field?: string;
  path_prefix?: string;
  parsers?: Array<Record<string, unknown>>;
  decoding?: Record<string, unknown>;
  content_type?: string;
  encoding?: string;
  override_content_type?: boolean;
  override_encoding?: boolean;
}

export interface AzureBlobStorageInputConfig extends AzureBlobStorageReaderConfig {
  account_name: string;
  storage_url?: string;
  auth: AzureBlobStorageAuthConfig;
  batch_size?: number;
  max_workers?: number;
  poll?: boolean;
  poll_interval?: string;
  containers: AzureBlobStorageContainerConfig[];
  file_selectors?: AzureBlobStorageFileSelectorConfig[];
  timestamp_epoch?: number;
  expand_event_list_from_field?: string;
  path_prefix?: string;

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
