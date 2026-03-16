/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats azure-eventhub input Go config:
 * https://github.com/elastic/beats/blob/main/x-pack/filebeat/input/azureeventhub/config.go
 */

export interface AzureEventHubSanitizerSpec {
  type: string;
}

export interface AzureEventHubInputConfig {
  eventhub: string;
  connection_string?: string;
  consumer_group?: string;
  storage_account: string;
  storage_account_key?: string;
  storage_account_connection_string?: string;
  storage_account_container?: string;
  resource_manager_endpoint?: string;

  auth_type?: 'connection_string' | 'client_secret' | 'managed_identity';
  eventhub_namespace?: string;
  tenant_id?: string;
  client_id?: string;
  client_secret?: string;
  authority_host?: string;
  managed_identity_client_id?: string;

  sanitize_options?: string[];
  sanitizers?: AzureEventHubSanitizerSpec[];

  migrate_checkpoint?: boolean;
  processor_version?: 'v1' | 'v2';
  processor_update_interval?: string;
  processor_start_position?: 'earliest' | 'latest';
  partition_receive_timeout?: string;
  partition_receive_count?: number;
  transport?: 'amqp' | 'websocket';

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
