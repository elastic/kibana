/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAgentTemplate } from './agent_templates';

const ALL_INPUT_TYPES = [
  'filestream',
  'aws-s3',
  'aws-cloudwatch',
  'azure-blob-storage',
  'azure-eventhub',
  'gcp-pubsub',
  'gcs',
  'http_endpoint',
  'kafka',
  'tcp',
  'udp',
  'cloudfoundry',
  'journald',
];

describe('buildAgentTemplate', () => {
  describe('common section', () => {
    it.each(ALL_INPUT_TYPES)('%s includes the common tags/processors section', (inputType) => {
      const template = buildAgentTemplate(inputType);
      expect(template).toContain('tags:');
      expect(template).toContain('{{#if preserve_original_event}}');
      expect(template).toContain('  - preserve_original_event');
      expect(template).toContain('{{#each tags as |tag|}}');
      expect(template).toContain('{{#contains "forwarded" tags}}');
      expect(template).toContain('publisher_pipeline.disable_host: true');
      expect(template).toContain('{{#if processors}}');
      expect(template).toContain('{{processors}}');
    });
  });

  describe('unknown input type', () => {
    it('returns only the common section for an unknown input type', () => {
      const template = buildAgentTemplate('nonexistent_input');
      expect(template).toContain('tags:');
      expect(template).toContain('{{#if processors}}');
      const lines = template.split('\n').filter((l) => l.trim().length > 0);
      const tagsIndex = lines.findIndex((l) => l === 'tags:');
      expect(tagsIndex).toBe(0);
    });
  });

  describe('filestream', () => {
    it('renders paths as an each block', () => {
      const template = buildAgentTemplate('filestream');
      expect(template).toContain('paths:');
      expect(template).toContain('{{#each paths as |path|}}');
      expect(template).toContain('  - {{path}}');
    });

    it('renders exclude_files with prospector.scanner prefix', () => {
      const template = buildAgentTemplate('filestream');
      expect(template).toContain('{{#if exclude_files}}');
      expect(template).toContain('prospector.scanner.exclude_files:');
      expect(template).toContain('{{#each exclude_files as |pattern|}}');
    });

    it('renders custom as a scalar', () => {
      const template = buildAgentTemplate('filestream');
      expect(template).toContain('{{#if custom}}');
      expect(template).toContain('custom: {{custom}}');
    });
  });

  describe('tcp', () => {
    it('renders host as a composite field (address:port)', () => {
      const template = buildAgentTemplate('tcp');
      expect(template).toContain('host: {{listen_address}}:{{listen_port}}');
    });

    it('includes all tcp-specific scalar fields', () => {
      const template = buildAgentTemplate('tcp');
      expect(template).toContain('max_message_size: {{max_message_size}}');
      expect(template).toContain('framing: {{framing}}');
      expect(template).toContain('line_delimiter: {{line_delimiter}}');
      expect(template).toContain('max_connections: {{max_connections}}');
      expect(template).toContain('timeout: {{timeout}}');
      expect(template).toContain('keep_null: {{keep_null}}');
    });

    it('wraps optional fields in #if blocks', () => {
      const template = buildAgentTemplate('tcp');
      expect(template).toContain('{{#if max_message_size}}');
      expect(template).toContain('{{#if framing}}');
      expect(template).toContain('{{#if timeout}}');
    });

    it('does NOT wrap host in an #if block (always rendered)', () => {
      const template = buildAgentTemplate('tcp');
      const hostLine = template.split('\n').find((l) => l.startsWith('host: {{listen_address}}'));
      expect(hostLine).toBeDefined();
      const hostIdx = template.indexOf('host: {{listen_address}}');
      const preceding = template.substring(Math.max(0, hostIdx - 20), hostIdx);
      expect(preceding).not.toContain('{{#if');
    });
  });

  describe('udp', () => {
    it('renders host as a composite field (address:port)', () => {
      const template = buildAgentTemplate('udp');
      expect(template).toContain('host: {{listen_address}}:{{listen_port}}');
    });

    it('includes max_message_size and timeout', () => {
      const template = buildAgentTemplate('udp');
      expect(template).toContain('max_message_size: {{max_message_size}}');
      expect(template).toContain('timeout: {{timeout}}');
    });

    it('does not include tcp-only fields like framing or line_delimiter', () => {
      const template = buildAgentTemplate('udp');
      expect(template).not.toContain('framing:');
      expect(template).not.toContain('line_delimiter:');
      expect(template).not.toContain('max_connections:');
    });
  });

  describe('aws-s3', () => {
    it('contains mutual exclusion logic for queue_url vs bucket_arn', () => {
      const template = buildAgentTemplate('aws-s3');
      expect(template).toContain('{{#unless bucket_arn}}');
      expect(template).toContain('{{#unless non_aws_bucket_name}}');
      expect(template).toContain('queue_url: {{queue_url}}');
      expect(template).toContain('{{#unless queue_url}}');
      expect(template).toContain('bucket_arn: {{bucket_arn}}');
    });

    it('includes AWS credential fields', () => {
      const template = buildAgentTemplate('aws-s3');
      expect(template).toContain('access_key_id: {{access_key_id}}');
      expect(template).toContain('secret_access_key: {{secret_access_key}}');
      expect(template).toContain('session_token: {{session_token}}');
      expect(template).toContain('endpoint: {{endpoint}}');
      expect(template).toContain('default_region: {{default_region}}');
      expect(template).toContain('proxy_url: {{proxy_url}}');
    });

    it('renders file_selectors as a yaml block', () => {
      const template = buildAgentTemplate('aws-s3');
      expect(template).toContain('{{#if file_selectors}}');
      expect(template).toContain('file_selectors:');
      expect(template).toContain('{{file_selectors}}');
    });

    it('renders parsers as a yaml block', () => {
      const template = buildAgentTemplate('aws-s3');
      expect(template).toContain('{{#if parsers}}');
      expect(template).toContain('parsers:');
      expect(template).toContain('{{parsers}}');
    });
  });

  describe('aws-cloudwatch', () => {
    it('contains mutual exclusion logic for log_group identifiers', () => {
      const template = buildAgentTemplate('aws-cloudwatch');
      expect(template).toContain('{{#unless log_group_name}}');
      expect(template).toContain('{{#unless log_group_name_prefix}}');
      expect(template).toContain('log_group_arn: {{log_group_arn}}');
      expect(template).toContain('log_group_name_prefix: {{log_group_name_prefix}}');
      expect(template).toContain('log_group_name: {{log_group_name}}');
    });

    it('includes region and credential fields', () => {
      const template = buildAgentTemplate('aws-cloudwatch');
      expect(template).toContain('region_name: {{region_name}}');
      expect(template).toContain('access_key_id: {{access_key_id}}');
      expect(template).toContain('secret_access_key: {{secret_access_key}}');
      expect(template).toContain('role_arn: {{role_arn}}');
    });
  });

  describe('azure-blob-storage', () => {
    it('maps service_account_key to auth.shared_credentials.account_key', () => {
      const template = buildAgentTemplate('azure-blob-storage');
      expect(template).toContain('{{#if service_account_key}}');
      expect(template).toContain('auth.shared_credentials.account_key: {{service_account_key}}');
    });

    it('maps service_account_uri to auth.connection_string.uri', () => {
      const template = buildAgentTemplate('azure-blob-storage');
      expect(template).toContain('auth.connection_string.uri: {{service_account_uri}}');
    });

    it('maps number_of_workers to max_workers config key', () => {
      const template = buildAgentTemplate('azure-blob-storage');
      expect(template).toContain('max_workers: {{number_of_workers}}');
    });

    it('renders containers as a yaml block', () => {
      const template = buildAgentTemplate('azure-blob-storage');
      expect(template).toContain('{{#if containers}}');
      expect(template).toContain('containers:');
      expect(template).toContain('{{containers}}');
    });
  });

  describe('azure-eventhub', () => {
    it('renders sanitize_options as a special raw block', () => {
      const template = buildAgentTemplate('azure-eventhub');
      expect(template).toContain('sanitize_options:');
      expect(template).toContain('{{#if sanitize_newlines}}');
      expect(template).toContain('  - NEW_LINES');
      expect(template).toContain('{{#if sanitize_singlequotes}}');
      expect(template).toContain('  - SINGLE_QUOTES');
    });

    it('includes core eventhub fields', () => {
      const template = buildAgentTemplate('azure-eventhub');
      expect(template).toContain('eventhub: {{eventhub}}');
      expect(template).toContain('consumer_group: {{consumer_group}}');
      expect(template).toContain('connection_string: {{connection_string}}');
      expect(template).toContain('storage_account: {{storage_account}}');
      expect(template).toContain('storage_account_key: {{storage_account_key}}');
    });
  });

  describe('gcp-pubsub', () => {
    it('maps subscription_name to subscription.name', () => {
      const template = buildAgentTemplate('gcp-pubsub');
      expect(template).toContain('subscription.name: {{subscription_name}}');
    });

    it('maps subscription_create to subscription.create', () => {
      const template = buildAgentTemplate('gcp-pubsub');
      expect(template).toContain('subscription.create: {{subscription_create}}');
    });

    it('maps subscription_num_goroutines to subscription.num_goroutines', () => {
      const template = buildAgentTemplate('gcp-pubsub');
      expect(template).toContain('subscription.num_goroutines: {{subscription_num_goroutines}}');
    });

    it('quotes credentials_json value', () => {
      const template = buildAgentTemplate('gcp-pubsub');
      expect(template).toContain("credentials_json: '{{credentials_json}}'");
    });
  });

  describe('gcs', () => {
    it('maps service_account_key to auth.credentials_json.account_key', () => {
      const template = buildAgentTemplate('gcs');
      expect(template).toContain('auth.credentials_json.account_key: {{service_account_key}}');
    });

    it('maps service_account_file to auth.credentials_file.path', () => {
      const template = buildAgentTemplate('gcs');
      expect(template).toContain('auth.credentials_file.path: {{service_account_file}}');
    });

    it('maps number_of_workers to max_workers', () => {
      const template = buildAgentTemplate('gcs');
      expect(template).toContain('max_workers: {{number_of_workers}}');
    });

    it('renders buckets as a yaml block', () => {
      const template = buildAgentTemplate('gcs');
      expect(template).toContain('{{#if buckets}}');
      expect(template).toContain('buckets:');
      expect(template).toContain('{{buckets}}');
    });
  });

  describe('http_endpoint', () => {
    it('maps secret_header to secret.header', () => {
      const template = buildAgentTemplate('http_endpoint');
      expect(template).toContain('secret.header: {{secret_header}}');
    });

    it('maps hmac fields to dot-notation config keys', () => {
      const template = buildAgentTemplate('http_endpoint');
      expect(template).toContain('hmac.header: {{hmac_header}}');
      expect(template).toContain('hmac.key: {{hmac_key}}');
      expect(template).toContain('hmac.type: {{hmac_type}}');
      expect(template).toContain('hmac.prefix: {{hmac_prefix}}');
    });

    it('quotes response_body', () => {
      const template = buildAgentTemplate('http_endpoint');
      expect(template).toContain("response_body: '{{response_body}}'");
    });

    it('renders include_headers as an array', () => {
      const template = buildAgentTemplate('http_endpoint');
      expect(template).toContain('{{#if include_headers}}');
      expect(template).toContain('include_headers:');
      expect(template).toContain('{{#each include_headers as |item|}}');
      expect(template).toContain('  - {{item}}');
    });
  });

  describe('kafka', () => {
    it('renders hosts and topics as arrays', () => {
      const template = buildAgentTemplate('kafka');
      expect(template).toContain('{{#if hosts}}');
      expect(template).toContain('hosts:');
      expect(template).toContain('{{#each hosts as |item|}}');
      expect(template).toContain('{{#if topics}}');
      expect(template).toContain('topics:');
      expect(template).toContain('{{#each topics as |item|}}');
    });

    it('maps fetch fields to dot-notation config keys', () => {
      const template = buildAgentTemplate('kafka');
      expect(template).toContain('fetch.min: {{fetch_min}}');
      expect(template).toContain('fetch.default: {{fetch_default}}');
      expect(template).toContain('fetch.max: {{fetch_max}}');
    });

    it('maps rebalance fields to dot-notation config keys', () => {
      const template = buildAgentTemplate('kafka');
      expect(template).toContain('rebalance.strategy: {{rebalance_strategy}}');
      expect(template).toContain('rebalance.timeout: {{rebalance_timeout}}');
      expect(template).toContain('rebalance.max_retries: {{rebalance_max_retries}}');
      expect(template).toContain('rebalance.retry_backoff: {{rebalance_retry_backoff}}');
    });

    it('maps kerberos fields to dot-notation config keys', () => {
      const template = buildAgentTemplate('kafka');
      expect(template).toContain('kerberos.enabled: {{kerberos_enabled}}');
      expect(template).toContain('kerberos.auth_type: {{kerberos_auth_type}}');
      expect(template).toContain('kerberos.username: {{kerberos_username}}');
      expect(template).toContain('kerberos.password: {{kerberos_password}}');
      expect(template).toContain('kerberos.service_name: {{kerberos_service_name}}');
    });

    it('renders parsers as a yaml block', () => {
      const template = buildAgentTemplate('kafka');
      expect(template).toContain('{{#if parsers}}');
      expect(template).toContain('parsers:');
      expect(template).toContain('{{parsers}}');
    });
  });

  describe('cloudfoundry', () => {
    it('includes Cloud Foundry specific fields', () => {
      const template = buildAgentTemplate('cloudfoundry');
      expect(template).toContain('api_address: {{api_address}}');
      expect(template).toContain('doppler_address: {{doppler_address}}');
      expect(template).toContain('uaa_address: {{uaa_address}}');
      expect(template).toContain('rlp_address: {{rlp_address}}');
      expect(template).toContain('client_id: {{client_id}}');
      expect(template).toContain('client_secret: {{client_secret}}');
    });
  });

  describe('journald', () => {
    it('starts with a linux platform condition', () => {
      const template = buildAgentTemplate('journald');
      expect(template).toContain("condition: ${host.platform} == 'linux'");
    });

    it('renders include_matches as an array', () => {
      const template = buildAgentTemplate('journald');
      expect(template).toContain('{{#if include_matches}}');
      expect(template).toContain('include_matches:');
      expect(template).toContain('{{#each include_matches as |item|}}');
    });

    it('renders paths as an array', () => {
      const template = buildAgentTemplate('journald');
      expect(template).toContain('{{#if paths}}');
      expect(template).toContain('paths:');
      expect(template).toContain('{{#each paths as |item|}}');
    });
  });

  describe('structural validation', () => {
    it.each(ALL_INPUT_TYPES)(
      '%s has balanced handlebars blocks (every #if has /if, every #each has /each)',
      (inputType) => {
        const template = buildAgentTemplate(inputType);
        const ifOpens = (template.match(/\{\{#if /g) || []).length;
        const ifCloses = (template.match(/\{\{\/if\}\}/g) || []).length;
        expect(ifOpens).toBe(ifCloses);

        const eachOpens = (template.match(/\{\{#each /g) || []).length;
        const eachCloses = (template.match(/\{\{\/each\}\}/g) || []).length;
        expect(eachOpens).toBe(eachCloses);

        const unlessOpens = (template.match(/\{\{#unless /g) || []).length;
        const unlessCloses = (template.match(/\{\{\/unless\}\}/g) || []).length;
        expect(unlessOpens).toBe(unlessCloses);
      }
    );

    it.each(ALL_INPUT_TYPES)('%s produces non-empty output', (inputType) => {
      const template = buildAgentTemplate(inputType);
      expect(template.trim().length).toBeGreaterThan(0);
    });

    it.each(ALL_INPUT_TYPES)(
      '%s common section appears after input-specific section',
      (inputType) => {
        const template = buildAgentTemplate(inputType);
        const tagsIdx = template.indexOf('tags:');
        const commonProcessorsIdx = template.indexOf('{{#if processors}}');
        expect(tagsIdx).toBeGreaterThan(-1);
        expect(commonProcessorsIdx).toBeGreaterThan(tagsIdx);
      }
    );
  });

  describe('comparison with automatic_import reference templates', () => {
    it('tcp template matches the automatic_import template structure', () => {
      const template = buildAgentTemplate('tcp');
      const expectedPatterns = [
        'host: {{listen_address}}:{{listen_port}}',
        '{{#if max_message_size}}\nmax_message_size: {{max_message_size}}\n{{/if}}',
        '{{#if framing}}\nframing: {{framing}}\n{{/if}}',
        '{{#if line_delimiter}}\nline_delimiter: {{line_delimiter}}\n{{/if}}',
        '{{#if max_connections}}\nmax_connections: {{max_connections}}\n{{/if}}',
        '{{#if timeout}}\ntimeout: {{timeout}}\n{{/if}}',
        '{{#if keep_null}}\nkeep_null: {{keep_null}}\n{{/if}}',
      ];
      for (const pattern of expectedPatterns) {
        expect(template).toContain(pattern);
      }
    });

    it('udp template matches the automatic_import template structure', () => {
      const template = buildAgentTemplate('udp');
      const expectedPatterns = [
        'host: {{listen_address}}:{{listen_port}}',
        '{{#if max_message_size}}\nmax_message_size: {{max_message_size}}\n{{/if}}',
        '{{#if timeout}}\ntimeout: {{timeout}}\n{{/if}}',
        '{{#if keep_null}}\nkeep_null: {{keep_null}}\n{{/if}}',
      ];
      for (const pattern of expectedPatterns) {
        expect(template).toContain(pattern);
      }
    });

    it('gcp-pubsub template matches the automatic_import template structure', () => {
      const template = buildAgentTemplate('gcp-pubsub');
      const expectedPatterns = [
        '{{#if project_id}}\nproject_id: {{project_id}}\n{{/if}}',
        '{{#if topic}}\ntopic: {{topic}}\n{{/if}}',
        '{{#if subscription_name}}\nsubscription.name: {{subscription_name}}\n{{/if}}',
        '{{#if subscription_create}}\nsubscription.create: {{subscription_create}}\n{{/if}}',
        '{{#if credentials_file}}\ncredentials_file: {{credentials_file}}\n{{/if}}',
        "{{#if credentials_json}}\ncredentials_json: '{{credentials_json}}'\n{{/if}}",
        '{{#if alternative_host}}\nalternative_host: {{alternative_host}}\n{{/if}}',
      ];
      for (const pattern of expectedPatterns) {
        expect(template).toContain(pattern);
      }
    });

    it('cloudfoundry template matches the automatic_import template structure', () => {
      const template = buildAgentTemplate('cloudfoundry');
      const expectedPatterns = [
        '{{#if api_address}}\napi_address: {{api_address}}\n{{/if}}',
        '{{#if doppler_address}}\ndoppler_address: {{doppler_address}}\n{{/if}}',
        '{{#if uaa_address}}\nuaa_address: {{uaa_address}}\n{{/if}}',
        '{{#if rlp_address}}\nrlp_address: {{rlp_address}}\n{{/if}}',
        '{{#if client_id}}\nclient_id: {{client_id}}\n{{/if}}',
        '{{#if client_secret}}\nclient_secret: {{client_secret}}\n{{/if}}',
        '{{#if version}}\nversion: {{version}}\n{{/if}}',
        '{{#if shard_id}}\nshard_id: {{shard_id}}\n{{/if}}',
      ];
      for (const pattern of expectedPatterns) {
        expect(template).toContain(pattern);
      }
    });
  });
});
