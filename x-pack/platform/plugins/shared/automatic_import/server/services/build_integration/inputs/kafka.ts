/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats kafka input Go config:
 * https://github.com/elastic/beats/blob/main/filebeat/input/kafka/config.go
 */

export interface KafkaFetchConfig {
  min?: number;
  default?: number;
  max?: number;
}

export interface KafkaRebalanceConfig {
  strategy?: 'range' | 'roundrobin';
  timeout?: string;
  max_retries?: number;
  retry_backoff?: string;
}

export interface KafkaTlsConfig {
  enabled?: boolean;
  certificate?: string;
  key?: string;
  certificate_authorities?: string[];
  verification_mode?: string;
}

export interface KafkaKerberosConfig {
  auth_type?: 'keytab' | 'password';
  keytab_path?: string;
  config_path?: string;
  service_name?: string;
  username?: string;
  password?: string;
  realm?: string;
  enable_fast?: boolean;
}

export interface KafkaSaslConfig {
  mechanism?: 'PLAIN' | 'SCRAM-SHA-256' | 'SCRAM-SHA-512';
}

export interface KafkaInputConfig {
  hosts: string[];
  topics: string[];
  group_id: string;
  client_id?: string;
  version?: string;
  initial_offset?: 'oldest' | 'newest';
  connect_backoff?: string;
  consume_backoff?: string;
  wait_close?: string;
  max_wait_time?: string;
  isolation_level?: 'read_uncommitted' | 'read_committed';
  fetch?: KafkaFetchConfig;
  rebalance?: KafkaRebalanceConfig;
  ssl?: KafkaTlsConfig;
  kerberos?: KafkaKerberosConfig;
  username?: string;
  password?: string;
  sasl?: KafkaSaslConfig;
  expand_event_list_from_field?: string;
  parsers?: Array<Record<string, unknown>>;

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
