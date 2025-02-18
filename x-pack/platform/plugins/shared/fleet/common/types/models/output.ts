/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { outputType } from '../../constants';
import type { ValueOf } from '..';
import type { kafkaAuthType, kafkaCompressionType, kafkaSaslMechanism } from '../../constants';
import type { kafkaPartitionType } from '../../constants';
import type { kafkaTopicWhenType } from '../../constants';
import type { kafkaAcknowledgeReliabilityLevel } from '../../constants';
import type { kafkaVerificationModes } from '../../constants';
import type { kafkaConnectionType } from '../../constants';

export type OutputType = typeof outputType;
export type KafkaCompressionType = typeof kafkaCompressionType;
export type KafkaAuthType = typeof kafkaAuthType;
export type KafkaConnectionTypeType = typeof kafkaConnectionType;
export type KafkaSaslMechanism = typeof kafkaSaslMechanism;
export type KafkaPartitionType = typeof kafkaPartitionType;
export type KafkaTopicWhenType = typeof kafkaTopicWhenType;
export type KafkaAcknowledgeReliabilityLevel = typeof kafkaAcknowledgeReliabilityLevel;
export type KafkaVerificationMode = typeof kafkaVerificationModes;
export type OutputSecret =
  | string
  | {
      id: string;
      hash?: string;
    };

export type OutputPreset = 'custom' | 'balanced' | 'throughput' | 'scale' | 'latency';

interface NewBaseOutput {
  is_default: boolean;
  is_default_monitoring: boolean;
  is_internal?: boolean;
  is_preconfigured?: boolean;
  name: string;
  type: ValueOf<OutputType>;
  hosts?: string[];
  ca_sha256?: string | null;
  ca_trusted_fingerprint?: string | null;
  config_yaml?: string | null;
  ssl?: {
    certificate_authorities?: string[];
    certificate?: string;
    key?: string;
    verification_mode?: ValueOf<KafkaVerificationMode>;
  } | null;
  proxy_id?: string | null;
  shipper?: ShipperOutput | null;
  allow_edit?: string[];
  secrets?: {};
  preset?: OutputPreset;
}

export interface NewElasticsearchOutput extends NewBaseOutput {
  type: OutputType['Elasticsearch'];
}

export interface NewRemoteElasticsearchOutput extends NewBaseOutput {
  type: OutputType['RemoteElasticsearch'];
  service_token?: string | null;
  secrets?: {
    service_token?: OutputSecret;
    kibana_api_key?: OutputSecret;
  };
  sync_integrations?: boolean;
  kibana_url?: string | null;
  kibana_api_key?: string | null;
}

export interface NewLogstashOutput extends NewBaseOutput {
  type: OutputType['Logstash'];
  secrets?: {
    ssl?: {
      key?: OutputSecret;
    };
  };
}

export type NewOutput =
  | NewElasticsearchOutput
  | NewRemoteElasticsearchOutput
  | NewLogstashOutput
  | KafkaOutput;

export type Output = NewOutput & {
  id: string;
};

export interface ShipperOutput {
  disk_queue_enabled?: boolean | null;
  disk_queue_path?: string | null;
  disk_queue_max_size?: number | null;
  disk_queue_encryption_enabled?: boolean | null;
  disk_queue_compression_enabled?: boolean | null;
  compression_level?: number | null;
  loadbalance?: boolean | null;
  mem_queue_events?: number | null;
  queue_flush_timeout?: number | null;
  max_batch_bytes?: number | null;
}

export interface KafkaOutput extends NewBaseOutput {
  type: OutputType['Kafka'];
  hosts?: string[];
  client_id?: string;
  version?: string;
  key?: string;
  compression?: ValueOf<KafkaCompressionType>;
  compression_level?: number;
  auth_type?: ValueOf<KafkaAuthType>;
  connection_type?: ValueOf<KafkaConnectionTypeType>;
  username?: string | null;
  password?: string | null;
  sasl?: {
    mechanism?: ValueOf<KafkaSaslMechanism>;
  } | null;
  partition?: ValueOf<KafkaPartitionType>;
  random?: {
    group_events?: number;
  };
  round_robin?: {
    group_events?: number;
  };
  hash?: {
    hash?: string;
    random?: boolean;
  };
  topic?: string;
  headers?: Array<{
    key: string;
    value: string;
  }>;
  timeout?: number;
  broker_timeout?: number;
  required_acks?: ValueOf<KafkaAcknowledgeReliabilityLevel>;
  secrets?: {
    password?: OutputSecret;
    ssl?: {
      key?: OutputSecret;
    };
  };
}
