/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Each directive describes how a single config field is rendered in the
 * agent `.yml.hbs` template. The builder converts these into Handlebars
 * markup so we never hand-edit template strings.
 */
export type AgentConfigDirective =
  | { type: 'scalar'; varName: string; configKey?: string; quoted?: boolean }
  | { type: 'array'; varName: string; configKey?: string }
  | { type: 'yaml_block'; varName: string; configKey?: string }
  | { type: 'raw'; content: string };

const scalar = (varName: string, configKey?: string, quoted?: boolean): AgentConfigDirective => ({
  type: 'scalar',
  varName,
  configKey,
  quoted,
});

const array = (varName: string, configKey?: string): AgentConfigDirective => ({
  type: 'array',
  varName,
  configKey,
});

const yamlBlock = (varName: string, configKey?: string): AgentConfigDirective => ({
  type: 'yaml_block',
  varName,
  configKey,
});

const raw = (content: string): AgentConfigDirective => ({
  type: 'raw',
  content,
});

const renderDirective = (d: AgentConfigDirective): string => {
  switch (d.type) {
    case 'scalar': {
      const key = d.configKey ?? d.varName;
      const val = d.quoted ? `'{{${d.varName}}}'` : `{{${d.varName}}}`;
      return `{{#if ${d.varName}}}\n${key}: ${val}\n{{/if}}`;
    }
    case 'array': {
      const key = d.configKey ?? d.varName;
      return [
        `{{#if ${d.varName}}}`,
        `${key}:`,
        `{{#each ${d.varName} as |item|}}`,
        `  - {{item}}`,
        `{{/each}}`,
        `{{/if}}`,
      ].join('\n');
    }
    case 'yaml_block': {
      const key = d.configKey ?? d.varName;
      return `{{#if ${d.varName}}}\n${key}:\n{{${d.varName}}}\n{{/if}}`;
    }
    case 'raw':
      return d.content;
  }
};

const COMMON_DIRECTIVES: AgentConfigDirective[] = [
  raw(
    [
      'tags:',
      '{{#if preserve_original_event}}',
      '  - preserve_original_event',
      '{{/if}}',
      '{{#each tags as |tag|}}',
      '  - {{tag}}',
      '{{/each}}',
      '{{#contains "forwarded" tags}}',
      'publisher_pipeline.disable_host: true',
      '{{/contains}}',
      '{{#if processors}}',
      'processors:',
      '{{processors}}',
      '{{/if}}',
    ].join('\n')
  ),
];

const FILESTREAM: AgentConfigDirective[] = [
  raw(['paths:', '{{#each paths as |path|}}', '  - {{path}}', '{{/each}}'].join('\n')),
  raw(
    [
      '{{#if exclude_files}}',
      'prospector.scanner.exclude_files:',
      '{{#each exclude_files as |pattern|}}',
      '  - {{pattern}}',
      '{{/each}}',
      '{{/if}}',
    ].join('\n')
  ),
  scalar('custom'),
];

const AWS_S3: AgentConfigDirective[] = [
  raw(
    [
      '{{#unless bucket_arn}}',
      '{{#unless non_aws_bucket_name}}',
      '{{#if queue_url}}',
      'queue_url: {{queue_url}}',
      '{{/if}}',
      '{{/unless}}',
      '{{/unless}}',
    ].join('\n')
  ),
  raw(
    [
      '{{#unless queue_url}}',
      '{{#if number_of_workers}}',
      'number_of_workers: {{number_of_workers}}',
      '{{/if}}',
      '{{#if bucket_list_prefix}}',
      'bucket_list_prefix: {{bucket_list_prefix}}',
      '{{/if}}',
      '{{#if bucket_list_interval}}',
      'bucket_list_interval: {{bucket_list_interval}}',
      '{{/if}}',
      '{{#unless non_aws_bucket_name}}',
      '{{#if bucket_arn}}',
      'bucket_arn: {{bucket_arn}}',
      '{{/if}}',
      '{{/unless}}',
      '{{#unless bucket_arn}}',
      '{{#if non_aws_bucket_name}}',
      'non_aws_bucket_name: {{non_aws_bucket_name}}',
      '{{/if}}',
      '{{/unless}}',
      '{{/unless}}',
    ].join('\n')
  ),
  scalar('buffer_size'),
  scalar('content_type'),
  scalar('encoding'),
  scalar('expand_event_list_from_field'),
  scalar('fips_enabled'),
  scalar('include_s3_metadata'),
  scalar('max_bytes'),
  scalar('max_number_of_messages'),
  scalar('path_style'),
  scalar('provider'),
  scalar('sqs.max_receive_count'),
  scalar('sqs.wait_time'),
  yamlBlock('file_selectors'),
  scalar('credential_profile_name'),
  scalar('shared_credential_file'),
  scalar('visibility_timeout'),
  scalar('api_timeout'),
  scalar('endpoint'),
  scalar('default_region'),
  scalar('access_key_id'),
  scalar('secret_access_key'),
  scalar('session_token'),
  scalar('role_arn'),
  scalar('fips_enabled'),
  scalar('proxy_url'),
  yamlBlock('parsers'),
];

const AWS_CLOUDWATCH: AgentConfigDirective[] = [
  raw(
    [
      '{{#unless log_group_name}}',
      '{{#unless log_group_name_prefix}}',
      '{{#if log_group_arn}}',
      'log_group_arn: {{log_group_arn}}',
      '{{/if}}',
      '{{/unless}}',
      '{{/unless}}',
      '{{#unless log_group_arn}}',
      '{{#unless log_group_name}}',
      '{{#if log_group_name_prefix}}',
      'log_group_name_prefix: {{log_group_name_prefix}}',
      '{{/if}}',
      '{{/unless}}',
      '{{/unless}}',
      '{{#unless log_group_arn}}',
      '{{#unless log_group_name_prefix}}',
      '{{#if log_group_name}}',
      'log_group_name: {{log_group_name}}',
      '{{/if}}',
      '{{/unless}}',
      '{{/unless}}',
      '{{#unless log_group_arn}}',
      'region_name: {{region_name}}',
      '{{/unless}}',
    ].join('\n')
  ),
  raw(
    [
      '{{#unless log_stream_prefix}}',
      '{{#if log_streams}}',
      'log_streams: {{log_streams}}',
      '{{/if}}',
      '{{/unless}}',
      '{{#unless log_streams}}',
      '{{#if log_stream_prefix}}',
      'log_stream_prefix: {{log_stream_prefix}}',
      '{{/if}}',
      '{{/unless}}',
    ].join('\n')
  ),
  scalar('start_position'),
  scalar('scan_frequency'),
  scalar('api_sleep'),
  scalar('api_timeout'),
  scalar('latency'),
  scalar('number_of_workers'),
  scalar('credential_profile_name'),
  scalar('shared_credential_file'),
  scalar('default_region'),
  scalar('access_key_id'),
  scalar('secret_access_key'),
  scalar('session_token'),
  scalar('role_arn'),
  scalar('proxy_url'),
];

const AZURE_BLOB_STORAGE: AgentConfigDirective[] = [
  scalar('account_name'),
  scalar('service_account_key', 'auth.shared_credentials.account_key'),
  scalar('service_account_uri', 'auth.connection_string.uri'),
  scalar('storage_url'),
  scalar('number_of_workers', 'max_workers'),
  scalar('poll'),
  scalar('poll_interval'),
  yamlBlock('containers'),
  yamlBlock('file_selectors'),
  scalar('timestamp_epoch'),
  scalar('expand_event_list_from_field'),
];

const AZURE_EVENTHUB: AgentConfigDirective[] = [
  scalar('eventhub'),
  scalar('consumer_group'),
  scalar('connection_string'),
  scalar('storage_account'),
  scalar('storage_account_key'),
  scalar('storage_account_container'),
  scalar('resource_manager_endpoint'),
  raw(
    [
      'sanitize_options:',
      '{{#if sanitize_newlines}}',
      '  - NEW_LINES',
      '{{/if}}',
      '{{#if sanitize_singlequotes}}',
      '  - SINGLE_QUOTES',
      '{{/if}}',
    ].join('\n')
  ),
];

const GCP_PUBSUB: AgentConfigDirective[] = [
  scalar('project_id'),
  scalar('topic'),
  scalar('subscription_name', 'subscription.name'),
  scalar('subscription_create', 'subscription.create'),
  scalar('subscription_num_goroutines', 'subscription.num_goroutines'),
  scalar('subscription_max_outstanding_messages', 'subscription.max_outstanding_messages'),
  scalar('credentials_file'),
  scalar('credentials_json', undefined, true),
  scalar('alternative_host'),
];

const GCS: AgentConfigDirective[] = [
  scalar('project_id'),
  scalar('alternative_host'),
  scalar('service_account_key', 'auth.credentials_json.account_key'),
  scalar('service_account_file', 'auth.credentials_file.path'),
  scalar('number_of_workers', 'max_workers'),
  scalar('poll'),
  scalar('poll_interval'),
  scalar('bucket_timeout'),
  yamlBlock('buckets'),
  yamlBlock('file_selectors'),
  scalar('timestamp_epoch'),
];

const HTTP_ENDPOINT: AgentConfigDirective[] = [
  scalar('listen_address'),
  scalar('listen_port'),
  scalar('prefix'),
  scalar('preserve_original_event'),
  scalar('basic_auth'),
  scalar('username'),
  scalar('password'),
  scalar('secret_header', 'secret.header'),
  scalar('secret_value', 'secret.value'),
  scalar('hmac_header', 'hmac.header'),
  scalar('hmac_key', 'hmac.key'),
  scalar('hmac_type', 'hmac.type'),
  scalar('hmac_prefix', 'hmac.prefix'),
  scalar('content_type'),
  scalar('response_code'),
  scalar('response_body', undefined, true),
  scalar('url'),
  array('include_headers'),
];

const KAFKA: AgentConfigDirective[] = [
  array('hosts'),
  array('topics'),
  scalar('group_id'),
  scalar('client_id'),
  scalar('username'),
  scalar('password'),
  scalar('version'),
  scalar('initial_offset'),
  scalar('connect_backoff'),
  scalar('consume_backoff'),
  scalar('max_wait_time'),
  scalar('wait_close'),
  scalar('isolation_level'),
  scalar('expand_event_list_from_field'),
  scalar('fetch_min', 'fetch.min'),
  scalar('fetch_default', 'fetch.default'),
  scalar('fetch_max', 'fetch.max'),
  scalar('rebalance_strategy', 'rebalance.strategy'),
  scalar('rebalance_timeout', 'rebalance.timeout'),
  scalar('rebalance_max_retries', 'rebalance.max_retries'),
  scalar('rebalance_retry_backoff', 'rebalance.retry_backoff'),
  yamlBlock('parsers'),
  scalar('kerberos_enabled', 'kerberos.enabled'),
  scalar('kerberos_auth_type', 'kerberos.auth_type'),
  scalar('kerberos_config_path', 'kerberos.config_path'),
  scalar('kerberos_username', 'kerberos.username'),
  scalar('kerberos_password', 'kerberos.password'),
  scalar('kerberos_keytab', 'kerberos.keytab'),
  scalar('kerberos_service_name', 'kerberos.service_name'),
  scalar('kerberos_realm', 'kerberos.realm'),
  scalar('kerberos_enable_krb5_fast', 'kerberos.enable_krb5_fast'),
];

const TCP: AgentConfigDirective[] = [
  raw('host: {{listen_address}}:{{listen_port}}'),
  scalar('max_message_size'),
  scalar('framing'),
  scalar('line_delimiter'),
  scalar('max_connections'),
  scalar('timeout'),
  scalar('keep_null'),
];

const UDP: AgentConfigDirective[] = [
  raw('host: {{listen_address}}:{{listen_port}}'),
  scalar('max_message_size'),
  scalar('timeout'),
  scalar('keep_null'),
];

const CLOUDFOUNDRY: AgentConfigDirective[] = [
  scalar('api_address'),
  scalar('doppler_address'),
  scalar('uaa_address'),
  scalar('rlp_address'),
  scalar('client_id'),
  scalar('client_secret'),
  scalar('version'),
  scalar('shard_id'),
];

const JOURNALD: AgentConfigDirective[] = [
  raw("condition: ${host.platform} == 'linux'\n"),
  array('paths'),
  scalar('backoff'),
  scalar('max_backoff'),
  scalar('seek'),
  scalar('cursor_seek_fallback'),
  scalar('since'),
  scalar('units'),
  array('syslog_identifiers'),
  array('transports'),
  array('include_matches'),
];

const INPUT_DIRECTIVES_MAP: Record<string, AgentConfigDirective[]> = {
  filestream: FILESTREAM,
  'aws-s3': AWS_S3,
  'aws-cloudwatch': AWS_CLOUDWATCH,
  'azure-blob-storage': AZURE_BLOB_STORAGE,
  'azure-eventhub': AZURE_EVENTHUB,
  'gcp-pubsub': GCP_PUBSUB,
  gcs: GCS,
  http_endpoint: HTTP_ENDPOINT,
  kafka: KAFKA,
  tcp: TCP,
  udp: UDP,
  cloudfoundry: CLOUDFOUNDRY,
  journald: JOURNALD,
};

export const buildAgentTemplate = (inputType: string): string => {
  const inputDirectives = INPUT_DIRECTIVES_MAP[inputType] ?? [];
  const inputSection = inputDirectives.map(renderDirective).join('\n');
  const commonSection = COMMON_DIRECTIVES.map(renderDirective).join('\n');
  return `${inputSection}\n${commonSection}\n`;
};
