/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats aws-cloudwatch input Go config:
 * https://github.com/elastic/beats/blob/main/x-pack/filebeat/input/awscloudwatch/config.go
 */

export interface AwsCloudwatchInputConfig {
  log_group_arn?: string;
  log_group_name?: string;
  log_group_name_prefix?: string;
  include_linked_accounts_for_prefix_mode?: boolean;
  region_name?: string;
  log_streams?: string[];
  log_stream_prefix?: string;
  start_position?: 'beginning' | 'end' | 'lastSync';
  scan_frequency?: string;
  api_timeout?: string;
  api_sleep?: string;
  latency?: string;
  number_of_workers?: number;

  access_key_id?: string;
  secret_access_key?: string;
  session_token?: string;
  role_arn?: string;
  shared_credential_file?: string;
  credential_profile_name?: string;
  endpoint?: string;
  fips_enabled?: boolean;

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
