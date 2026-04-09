/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats aws-s3 input Go config:
 * https://github.com/elastic/beats/blob/main/x-pack/filebeat/input/awss3/config.go
 */

export interface AwsS3ReaderConfig {
  buffer_size?: number;
  content_type?: string;
  encoding?: string;
  expand_event_list_from_field?: string;
  include_s3_metadata?: string[];
  line_terminator?: string;
  max_bytes?: number;
  parsers?: Array<Record<string, unknown>>;
  decoding?: Record<string, unknown>;
}

export interface AwsS3FileSelectorConfig {
  regex: string;
  buffer_size?: number;
  content_type?: string;
  encoding?: string;
  expand_event_list_from_field?: string;
  include_s3_metadata?: string[];
  line_terminator?: string;
  max_bytes?: number;
  parsers?: Array<Record<string, unknown>>;
  decoding?: Record<string, unknown>;
}

export interface AwsS3BackupConfig {
  backup_to_bucket_arn?: string;
  non_aws_backup_to_bucket_name?: string;
  backup_to_bucket_prefix?: string;
  delete_after_backup?: boolean;
}

export interface AwsS3SqsConfig {
  max_receive_count?: number;
  notification_parsing_script?: AwsS3ScriptConfig;
  wait_time?: string;
  shutdown_grace_time?: string;
}

export interface AwsS3ScriptConfig {
  source?: string;
  file?: string;
  files?: string[];
  params?: Record<string, unknown>;
  timeout?: string;
  max_cached_sessions?: number;
}

export interface AwsS3InputConfig extends AwsS3ReaderConfig {
  api_timeout?: string;
  access_point_arn?: string;
  bucket_arn?: string;
  bucket_list_interval?: string;
  bucket_list_prefix?: string;
  file_selectors?: AwsS3FileSelectorConfig[];
  ignore_older?: string;
  lexicographical_ordering?: boolean;
  lexicographical_lookback_keys?: number;
  non_aws_bucket_name?: string;
  number_of_workers?: number;
  path_style?: boolean;
  provider?: string;
  queue_url?: string;
  region?: string;
  sqs?: AwsS3SqsConfig;
  start_timestamp?: string;
  visibility_timeout?: string;

  access_key_id?: string;
  secret_access_key?: string;
  session_token?: string;
  role_arn?: string;
  shared_credential_file?: string;
  credential_profile_name?: string;
  endpoint?: string;
  fips_enabled?: boolean;

  backup_to_bucket_arn?: string;
  non_aws_backup_to_bucket_name?: string;
  backup_to_bucket_prefix?: string;
  delete_after_backup?: boolean;

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
