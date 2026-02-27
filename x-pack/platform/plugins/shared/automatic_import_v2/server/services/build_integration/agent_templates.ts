/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const COMMON_TEMPLATE = `
tags:
{{#if preserve_original_event}}
  - preserve_original_event
{{/if}}
{{#each tags as |tag|}}
  - {{tag}}
{{/each}}
{{#contains "forwarded" tags}}
publisher_pipeline.disable_host: true
{{/contains}}
{{#if processors}}
processors:
{{processors}}
{{/if}}
`.trim();

const FILESTREAM_TEMPLATE = `
paths:
{{#each paths as |path|}}
  - {{path}}
{{/each}}
{{#if compression_gzip}}
compression: auto
gzip_experimental: true
{{/if}}
{{#if recursive_glob}}
prospector.scanner.recursive_glob: {{recursive_glob}}
{{/if}}
{{#if exclude_files}}
prospector.scanner.exclude_files:
{{#each exclude_files as |pattern|}}
  - {{pattern}}
{{/each}}
{{/if}}
{{#if include_files}}
prospector.scanner.include_files:
{{#each include_files as |pattern|}}
  - {{pattern}}
{{/each}}
{{/if}}
{{#if symlinks}}
prospector.scanner.symlinks: {{symlinks}}
{{/if}}
{{#if resend_on_touch}}
prospector.scanner.resend_on_touch: {{resend_on_touch}}
{{/if}}
{{#if check_interval}}
prospector.scanner.check_interval: {{check_interval}}
{{/if}}
{{#if ignore_older}}
ignore_older: {{ignore_older}}
{{/if}}
{{#if ignore_inactive}}
ignore_inactive: {{ignore_inactive}}
{{/if}}
{{#if close_on_state_changed_inactive}}
close.on_state_change.inactive: {{close_on_state_changed_inactive}}
{{/if}}
{{#if close_on_state_changed_renamed}}
close.on_state_change.renamed: {{close_on_state_changed_renamed}}
{{/if}}
{{#if close_on_state_changed_removed}}
close.on_state_change.removed: {{close_on_state_changed_removed}}
{{/if}}
{{#if close_reader_eof}}
close.reader.on_eof: {{close_reader_eof}}
{{/if}}
{{#if close_reader_after_interval}}
close.reader.after_interval: {{close_reader_after_interval}}
{{/if}}
{{#if clean_inactive}}
clean_inactive: {{clean_inactive}}
{{/if}}
{{#if clean_removed}}
clean_removed: {{clean_removed}}
{{/if}}
{{#if backoff_init}}
backoff.init: {{backoff_init}}
{{/if}}
{{#if backoff_max}}
backoff.max: {{backoff_max}}
{{/if}}
{{#if rotation_external_strategy_copytruncate}}
rotation.external.strategy.copytruncate: {{rotation_external_strategy_copytruncate}}
{{/if}}
{{#if encoding}}
encoding: {{encoding}}
{{/if}}
{{#if exclude_lines}}
exclude_lines:
{{#each exclude_lines as |item|}}
  - {{item}}
{{/each}}
{{/if}}
{{#if include_lines}}
include_lines:
{{#each include_lines as |item|}}
  - {{item}}
{{/each}}
{{/if}}
{{#if buffer_size}}
buffer_size: {{buffer_size}}
{{/if}}
{{#if message_max_bytes}}
message_max_bytes: {{message_max_bytes}}
{{/if}}
{{#if parsers}}
parsers:
{{parsers}}
{{/if}}
{{#if harvester_limit}}
harvester_limit: {{harvester_limit}}
{{/if}}
{{#if fingerprint}}
{{#unless file_identity_native}}
file_identity.fingerprint: ~
prospector.scanner.fingerprint.enabled: true
prospector.scanner.fingerprint.offset: {{fingerprint_offset}}
prospector.scanner.fingerprint.length: {{fingerprint_length}}
{{/unless}}
{{/if}}
{{#if file_identity_native}}
{{#unless fingerprint}}
file_identity.native: ~
prospector.scanner.fingerprint.enabled: false
{{/unless}}
{{/if}}
{{#if condition}}
condition: {{condition}}
{{/if}}
{{#if delete_enabled}}
delete.enabled: true
{{#if delete_grace_period}}
delete.grace_period: {{delete_grace_period}}
{{/if}}
{{/if}}
{{#if custom}}
custom: {{custom}}
{{/if}}
`.trim();

const AWS_S3_TEMPLATE = `
{{#unless bucket_arn}}
{{#unless non_aws_bucket_name}}
{{#if queue_url}}
queue_url: {{queue_url}}
{{/if}}
{{/unless}}
{{/unless}}
{{#unless queue_url}}
{{#if number_of_workers}}
number_of_workers: {{number_of_workers}}
{{/if}}
{{#if bucket_list_prefix}}
bucket_list_prefix: {{bucket_list_prefix}}
{{/if}}
{{#if bucket_list_interval}}
bucket_list_interval: {{bucket_list_interval}}
{{/if}}
{{#unless non_aws_bucket_name}}
{{#if bucket_arn}}
bucket_arn: {{bucket_arn}}
{{/if}}
{{/unless}}
{{#unless bucket_arn}}
{{#if non_aws_bucket_name}}
non_aws_bucket_name: {{non_aws_bucket_name}}
{{/if}}
{{/unless}}
{{/unless}}
{{#if buffer_size}}
buffer_size: {{buffer_size}}
{{/if}}
{{#if content_type}}
content_type: {{content_type}}
{{/if}}
{{#if encoding}}
encoding: {{encoding}}
{{/if}}
{{#if expand_event_list_from_field}}
expand_event_list_from_field: {{expand_event_list_from_field}}
{{/if}}
{{#if fips_enabled}}
fips_enabled: {{fips_enabled}}
{{/if}}
{{#if include_s3_metadata}}
include_s3_metadata: {{include_s3_metadata}}
{{/if}}
{{#if max_bytes}}
max_bytes: {{max_bytes}}
{{/if}}
{{#if max_number_of_messages}}
max_number_of_messages: {{max_number_of_messages}}
{{/if}}
{{#if path_style}}
path_style: {{path_style}}
{{/if}}
{{#if provider}}
provider: {{provider}}
{{/if}}
{{#if sqs.max_receive_count}}
sqs.max_receive_count: {{sqs.max_receive_count}}
{{/if}}
{{#if sqs.wait_time}}
sqs.wait_time: {{sqs.wait_time}}
{{/if}}
{{#if file_selectors}}
file_selectors:
{{file_selectors}}
{{/if}}
{{#if credential_profile_name}}
credential_profile_name: {{credential_profile_name}}
{{/if}}
{{#if shared_credential_file}}
shared_credential_file: {{shared_credential_file}}
{{/if}}
{{#if visibility_timeout}}
visibility_timeout: {{visibility_timeout}}
{{/if}}
{{#if api_timeout}}
api_timeout: {{api_timeout}}
{{/if}}
{{#if endpoint}}
endpoint: {{endpoint}}
{{/if}}
{{#if default_region}}
default_region: {{default_region}}
{{/if}}
{{#if access_key_id}}
access_key_id: {{access_key_id}}
{{/if}}
{{#if secret_access_key}}
secret_access_key: {{secret_access_key}}
{{/if}}
{{#if session_token}}
session_token: {{session_token}}
{{/if}}
{{#if role_arn}}
role_arn: {{role_arn}}
{{/if}}
{{#if fips_enabled}}
fips_enabled: {{fips_enabled}}
{{/if}}
{{#if proxy_url}}
proxy_url: {{proxy_url}}
{{/if}}
{{#if parsers}}
parsers:
{{parsers}}
{{/if}}
`.trim();

const AWS_CLOUDWATCH_TEMPLATE = `
{{#unless log_group_name}}
{{#unless log_group_name_prefix}}
{{#if log_group_arn}}
log_group_arn: {{log_group_arn}}
{{/if}}
{{/unless}}
{{/unless}}
{{#unless log_group_arn}}
{{#unless log_group_name}}
{{#if log_group_name_prefix}}
log_group_name_prefix: {{log_group_name_prefix}}
{{/if}}
{{/unless}}
{{/unless}}
{{#unless log_group_arn}}
{{#unless log_group_name_prefix}}
{{#if log_group_name}}
log_group_name: {{log_group_name}}
{{/if}}
{{/unless}}
{{/unless}}
{{#unless log_group_arn}}
region_name: {{region_name}}
{{/unless}}
{{#unless log_stream_prefix}}
{{#if log_streams}}
log_streams: {{log_streams}}
{{/if}}
{{/unless}}
{{#unless log_streams}}
{{#if log_stream_prefix}}
log_stream_prefix: {{log_stream_prefix}}
{{/if}}
{{/unless}}
{{#if start_position}}
start_position: {{start_position}}
{{/if}}
{{#if scan_frequency}}
scan_frequency: {{scan_frequency}}
{{/if}}
{{#if api_sleep}}
api_sleep: {{api_sleep}}
{{/if}}
{{#if api_timeout}}
api_timeout: {{api_timeout}}
{{/if}}
{{#if latency}}
latency: {{latency}}
{{/if}}
{{#if number_of_workers}}
number_of_workers: {{number_of_workers}}
{{/if}}
{{#if credential_profile_name}}
credential_profile_name: {{credential_profile_name}}
{{/if}}
{{#if shared_credential_file}}
shared_credential_file: {{shared_credential_file}}
{{/if}}
{{#if default_region}}
default_region: {{default_region}}
{{/if}}
{{#if access_key_id}}
access_key_id: {{access_key_id}}
{{/if}}
{{#if secret_access_key}}
secret_access_key: {{secret_access_key}}
{{/if}}
{{#if session_token}}
session_token: {{session_token}}
{{/if}}
{{#if role_arn}}
role_arn: {{role_arn}}
{{/if}}
{{#if proxy_url}}
proxy_url: {{proxy_url}}
{{/if}}
`.trim();

const AZURE_BLOB_STORAGE_TEMPLATE = `
{{#if account_name}}
account_name: {{account_name}}
{{/if}}
{{#if service_account_key}}
auth.shared_credentials.account_key: {{service_account_key}}
{{/if}}
{{#if service_account_uri}}
auth.connection_string.uri: {{service_account_uri}}
{{/if}}
{{#if storage_url}}
storage_url: {{storage_url}}
{{/if}}
{{#if number_of_workers}}
max_workers: {{number_of_workers}}
{{/if}}
{{#if poll}}
poll: {{poll}}
{{/if}}
{{#if poll_interval}}
poll_interval: {{poll_interval}}
{{/if}}
{{#if containers}}
containers:
{{containers}}
{{/if}}
{{#if file_selectors}}
file_selectors:
{{file_selectors}}
{{/if}}
{{#if timestamp_epoch}}
timestamp_epoch: {{timestamp_epoch}}
{{/if}}
{{#if expand_event_list_from_field}}
expand_event_list_from_field: {{expand_event_list_from_field}}
{{/if}}
`.trim();

const AZURE_EVENTHUB_TEMPLATE = `
{{#if eventhub}}
eventhub: {{eventhub}}
{{/if}}
{{#if consumer_group}}
consumer_group: {{consumer_group}}
{{/if}}
{{#if connection_string}}
connection_string: {{connection_string}}
{{/if}}
{{#if storage_account}}
storage_account: {{storage_account}}
{{/if}}
{{#if storage_account_key}}
storage_account_key: {{storage_account_key}}
{{/if}}
{{#if storage_account_container}}
storage_account_container: {{storage_account_container}}
{{/if}}
{{#if resource_manager_endpoint}}
resource_manager_endpoint: {{resource_manager_endpoint}}
{{/if}}
sanitize_options:
{{#if sanitize_newlines}}
  - NEW_LINES
{{/if}}
{{#if sanitize_singlequotes}}
  - SINGLE_QUOTES
{{/if}}
`.trim();

const GCP_PUBSUB_TEMPLATE = `
{{#if project_id}}
project_id: {{project_id}}
{{/if}}
{{#if topic}}
topic: {{topic}}
{{/if}}
{{#if subscription_name}}
subscription.name: {{subscription_name}}
{{/if}}
{{#if subscription_create}}
subscription.create: {{subscription_create}}
{{/if}}
{{#if subscription_num_goroutines}}
subscription.num_goroutines: {{subscription_num_goroutines}}
{{/if}}
{{#if subscription_max_outstanding_messages}}
subscription.max_outstanding_messages: {{subscription_max_outstanding_messages}}
{{/if}}
{{#if credentials_file}}
credentials_file: {{credentials_file}}
{{/if}}
{{#if credentials_json}}
credentials_json: '{{credentials_json}}'
{{/if}}
{{#if alternative_host}}
alternative_host: {{alternative_host}}
{{/if}}
`.trim();

const GCS_TEMPLATE = `
{{#if project_id}}
project_id: {{project_id}}
{{/if}}
{{#if alternative_host}}
alternative_host: {{alternative_host}}
{{/if}}
{{#if service_account_key}}
auth.credentials_json.account_key: {{service_account_key}}
{{/if}}
{{#if service_account_file}}
auth.credentials_file.path: {{service_account_file}}
{{/if}}
{{#if number_of_workers}}
max_workers: {{number_of_workers}}
{{/if}}
{{#if poll}}
poll: {{poll}}
{{/if}}
{{#if poll_interval}}
poll_interval: {{poll_interval}}
{{/if}}
{{#if bucket_timeout}}
bucket_timeout: {{bucket_timeout}}
{{/if}}
{{#if buckets}}
buckets:
{{buckets}}
{{/if}}
{{#if file_selectors}}
file_selectors:
{{file_selectors}}
{{/if}}
{{#if timestamp_epoch}}
timestamp_epoch: {{timestamp_epoch}}
{{/if}}
`.trim();

const HTTP_ENDPOINT_TEMPLATE = `
{{#if listen_address}}
listen_address: {{listen_address}}
{{/if}}
{{#if listen_port}}
listen_port: {{listen_port}}
{{/if}}
{{#if prefix}}
prefix: {{prefix}}
{{/if}}
{{#if preserve_original_event}}
preserve_original_event: {{preserve_original_event}}
{{/if}}
{{#if basic_auth}}
basic_auth: {{basic_auth}}
{{/if}}
{{#if username}}
username: {{username}}
{{/if}}
{{#if password}}
password: {{password}}
{{/if}}
{{#if secret_header}}
secret.header: {{secret_header}}
{{/if}}
{{#if secret_value}}
secret.value: {{secret_value}}
{{/if}}
{{#if hmac_header}}
hmac.header: {{hmac_header}}
{{/if}}
{{#if hmac_key}}
hmac.key: {{hmac_key}}
{{/if}}
{{#if hmac_type}}
hmac.type: {{hmac_type}}
{{/if}}
{{#if hmac_prefix}}
hmac.prefix: {{hmac_prefix}}
{{/if}}
{{#if content_type}}
content_type: {{content_type}}
{{/if}}
{{#if response_code}}
response_code: {{response_code}}
{{/if}}
{{#if response_body}}
response_body: '{{response_body}}'
{{/if}}
{{#if url}}
url: {{url}}
{{/if}}
{{#if include_headers}}
include_headers:
{{#each include_headers as |item|}}
  - {{item}}
{{/each}}
{{/if}}
`.trim();

const KAFKA_TEMPLATE = `
{{#if hosts}}
hosts:
{{#each hosts as |item|}}
  - {{item}}
{{/each}}
{{/if}}
{{#if topics}}
topics:
{{#each topics as |item|}}
  - {{item}}
{{/each}}
{{/if}}
{{#if group_id}}
group_id: {{group_id}}
{{/if}}
{{#if client_id}}
client_id: {{client_id}}
{{/if}}
{{#if username}}
username: {{username}}
{{/if}}
{{#if password}}
password: {{password}}
{{/if}}
{{#if version}}
version: {{version}}
{{/if}}
{{#if initial_offset}}
initial_offset: {{initial_offset}}
{{/if}}
{{#if connect_backoff}}
connect_backoff: {{connect_backoff}}
{{/if}}
{{#if consume_backoff}}
consume_backoff: {{consume_backoff}}
{{/if}}
{{#if max_wait_time}}
max_wait_time: {{max_wait_time}}
{{/if}}
{{#if wait_close}}
wait_close: {{wait_close}}
{{/if}}
{{#if isolation_level}}
isolation_level: {{isolation_level}}
{{/if}}
{{#if expand_event_list_from_field}}
expand_event_list_from_field: {{expand_event_list_from_field}}
{{/if}}
{{#if fetch_min}}
fetch.min: {{fetch_min}}
{{/if}}
{{#if fetch_default}}
fetch.default: {{fetch_default}}
{{/if}}
{{#if fetch_max}}
fetch.max: {{fetch_max}}
{{/if}}
{{#if rebalance_strategy}}
rebalance.strategy: {{rebalance_strategy}}
{{/if}}
{{#if rebalance_timeout}}
rebalance.timeout: {{rebalance_timeout}}
{{/if}}
{{#if rebalance_max_retries}}
rebalance.max_retries: {{rebalance_max_retries}}
{{/if}}
{{#if rebalance_retry_backoff}}
rebalance.retry_backoff: {{rebalance_retry_backoff}}
{{/if}}
{{#if parsers}}
parsers:
{{parsers}}
{{/if}}
{{#if kerberos_enabled}}
kerberos.enabled: {{kerberos_enabled}}
{{/if}}
{{#if kerberos_auth_type}}
kerberos.auth_type: {{kerberos_auth_type}}
{{/if}}
{{#if kerberos_config_path}}
kerberos.config_path: {{kerberos_config_path}}
{{/if}}
{{#if kerberos_username}}
kerberos.username: {{kerberos_username}}
{{/if}}
{{#if kerberos_password}}
kerberos.password: {{kerberos_password}}
{{/if}}
{{#if kerberos_keytab}}
kerberos.keytab: {{kerberos_keytab}}
{{/if}}
{{#if kerberos_service_name}}
kerberos.service_name: {{kerberos_service_name}}
{{/if}}
{{#if kerberos_realm}}
kerberos.realm: {{kerberos_realm}}
{{/if}}
{{#if kerberos_enable_krb5_fast}}
kerberos.enable_krb5_fast: {{kerberos_enable_krb5_fast}}
{{/if}}
`.trim();

const TCP_TEMPLATE = `
host: {{listen_address}}:{{listen_port}}
{{#if max_message_size}}
max_message_size: {{max_message_size}}
{{/if}}
{{#if framing}}
framing: {{framing}}
{{/if}}
{{#if line_delimiter}}
line_delimiter: {{line_delimiter}}
{{/if}}
{{#if max_connections}}
max_connections: {{max_connections}}
{{/if}}
{{#if timeout}}
timeout: {{timeout}}
{{/if}}
{{#if keep_null}}
keep_null: {{keep_null}}
{{/if}}
`.trim();

const UDP_TEMPLATE = `
host: {{listen_address}}:{{listen_port}}
{{#if max_message_size}}
max_message_size: {{max_message_size}}
{{/if}}
{{#if timeout}}
timeout: {{timeout}}
{{/if}}
{{#if keep_null}}
keep_null: {{keep_null}}
{{/if}}
`.trim();

const CLOUDFOUNDRY_TEMPLATE = `
{{#if api_address}}
api_address: {{api_address}}
{{/if}}
{{#if doppler_address}}
doppler_address: {{doppler_address}}
{{/if}}
{{#if uaa_address}}
uaa_address: {{uaa_address}}
{{/if}}
{{#if rlp_address}}
rlp_address: {{rlp_address}}
{{/if}}
{{#if client_id}}
client_id: {{client_id}}
{{/if}}
{{#if client_secret}}
client_secret: {{client_secret}}
{{/if}}
{{#if version}}
version: {{version}}
{{/if}}
{{#if shard_id}}
shard_id: {{shard_id}}
{{/if}}
`.trim();

const JOURNALD_TEMPLATE = `
condition: \${host.platform} == 'linux'
{{#if paths}}
paths:
{{#each paths as |item|}}
  - {{item}}
{{/each}}
{{/if}}
{{#if backoff}}
backoff: {{backoff}}
{{/if}}
{{#if max_backoff}}
max_backoff: {{max_backoff}}
{{/if}}
{{#if seek}}
seek: {{seek}}
{{/if}}
{{#if cursor_seek_fallback}}
cursor_seek_fallback: {{cursor_seek_fallback}}
{{/if}}
{{#if since}}
since: {{since}}
{{/if}}
{{#if units}}
units: {{units}}
{{/if}}
{{#if syslog_identifiers}}
syslog_identifiers:
{{#each syslog_identifiers as |item|}}
  - {{item}}
{{/each}}
{{/if}}
{{#if transports}}
transports:
{{#each transports as |item|}}
  - {{item}}
{{/each}}
{{/if}}
{{#if include_matches}}
include_matches:
{{#each include_matches as |item|}}
  - {{item}}
{{/each}}
{{/if}}
`.trim();

const INPUT_TEMPLATES: Record<string, string> = {
  filestream: FILESTREAM_TEMPLATE,
  'aws-s3': AWS_S3_TEMPLATE,
  'aws-cloudwatch': AWS_CLOUDWATCH_TEMPLATE,
  'azure-blob-storage': AZURE_BLOB_STORAGE_TEMPLATE,
  'azure-eventhub': AZURE_EVENTHUB_TEMPLATE,
  'gcp-pubsub': GCP_PUBSUB_TEMPLATE,
  gcs: GCS_TEMPLATE,
  http_endpoint: HTTP_ENDPOINT_TEMPLATE,
  kafka: KAFKA_TEMPLATE,
  tcp: TCP_TEMPLATE,
  udp: UDP_TEMPLATE,
  cloudfoundry: CLOUDFOUNDRY_TEMPLATE,
  journald: JOURNALD_TEMPLATE,
};

export const buildAgentTemplate = (inputType: string): string => {
  const inputSection = INPUT_TEMPLATES[inputType] ?? '';
  return `${inputSection}\n${COMMON_TEMPLATE}\n`;
};
