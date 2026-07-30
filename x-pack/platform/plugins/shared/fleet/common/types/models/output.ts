/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { outputType } from '../../constants';
import type { BaseSSLSecrets, ValueOf } from '..';
import type {
  kafkaAuthType,
  kafkaCompressionType,
  kafkaSaslMechanism,
  otlpProtocol,
  otlpCompressionType,
} from '../../constants';
import type { kafkaPartitionType } from '../../constants';
import type { kafkaTopicWhenType } from '../../constants';
import type { kafkaAcknowledgeReliabilityLevel } from '../../constants';
import type { kafkaVerificationModes } from '../../constants';
import type { kafkaConnectionType } from '../../constants';
import type { SOSecret } from '..';

export type OutputType = typeof outputType;
export type KafkaCompressionType = typeof kafkaCompressionType;
export type KafkaAuthType = typeof kafkaAuthType;
export type KafkaConnectionTypeType = typeof kafkaConnectionType;
export type KafkaSaslMechanism = typeof kafkaSaslMechanism;
export type KafkaPartitionType = typeof kafkaPartitionType;
export type KafkaTopicWhenType = typeof kafkaTopicWhenType;
export type KafkaAcknowledgeReliabilityLevel = typeof kafkaAcknowledgeReliabilityLevel;
export type KafkaVerificationMode = typeof kafkaVerificationModes;

export type OutputPreset = 'custom' | 'balanced' | 'throughput' | 'scale' | 'latency';

interface NewBaseOutput {
  is_default: boolean;
  is_default_monitoring: boolean;
  is_default_otel?: boolean;
  is_internal?: boolean;
  is_preconfigured?: boolean;
  name: string;
  type: ValueOf<OutputType>;
  allow_edit?: string[];
}

interface BeatsBaseOutput extends NewBaseOutput {
  proxy_id?: string | null;
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
  shipper?: ShipperOutput | null;
  secrets?: BaseSSLSecrets;
  preset?: OutputPreset;
  write_to_logs_streams?: boolean | null;
}

export interface OtelExporterOutput {
  otel_exporter_config_yaml?: string | null;
  otel_disable_beatsauth?: boolean | null;
}

export interface NewElasticsearchOutput extends BeatsBaseOutput, OtelExporterOutput {
  type: OutputType['Elasticsearch'];
}

export interface NewRemoteElasticsearchOutput extends BeatsBaseOutput, OtelExporterOutput {
  type: OutputType['RemoteElasticsearch'];
  service_token?: string | null;
  secrets?: RemoteESOutputSecrets;
  sync_integrations?: boolean;
  kibana_url?: string | null;
  kibana_api_key?: string | null;
  sync_uninstalled_integrations?: boolean;
}

export interface NewLogstashOutput extends BeatsBaseOutput {
  type: OutputType['Logstash'];
}

export type OtlpOutputProtocol = ValueOf<typeof otlpProtocol>;

// gRPC supports the full set; HTTP only supports gzip/none (enforced by service validation)
export type OtlpGrpcCompression = ValueOf<typeof otlpCompressionType>;
export type OtlpHttpCompression = 'gzip' | 'none';

export interface OtlpExporterConfig {
  endpoint: string;
  protocol: OtlpOutputProtocol;
  api_key?: string;
  headers?: Record<string, string>;
  compression?: OtlpGrpcCompression;
  timeout?: string;
  tls?: {
    insecure?: boolean;
    insecure_skip_verify?: boolean;
    ca_pem?: string;
    cert_pem?: string;
    key_pem?: string;
    include_system_ca_certs_pool?: boolean;
    min_version?: string;
    max_version?: string;
    reload_interval?: string;
  };
  sending_queue?: {
    enabled?: boolean;
    num_consumers?: number;
    queue_size?: number;
    sizer?: 'requests' | 'items' | 'bytes';
    wait_for_result?: boolean;
    block_on_overflow?: boolean;
  };
  retry_on_failure?: {
    enabled?: boolean;
    initial_interval?: string;
    max_interval?: string;
    max_elapsed_time?: string;
    multiplier?: number;
  };
  // http contains fields that are only valid when protocol is 'http/protobuf' (enforced by schema validation)
  http?: {
    encoding?: 'proto' | 'json';
    traces_endpoint?: string;
    metrics_endpoint?: string;
    logs_endpoint?: string;
    profiles_endpoint?: string;
    read_buffer_size?: number;
    write_buffer_size?: number;
  };
}

// Fields omitted from v1 — candidates for follow-up investigation:
// tls.server_name_override (SNI override), tls.cipher_suites, tls.curve_preferences,
// sending_queue.storage (persistent queue), sending_queue.batch.*,
// grpc.balancer_name, grpc.keepalive.*

export interface NewOtlpOutput extends NewBaseOutput {
  type: OutputType['Otlp'];
  otlp_exporter: OtlpExporterConfig;
  secrets?: OtlpOutputSecrets;
}

interface OtlpOutputSecrets {
  otlp_exporter?: {
    api_key?: SOSecret;
    tls?: {
      key_pem?: SOSecret;
    };
  };
}

export type PresetCapableOutput = NewElasticsearchOutput | NewRemoteElasticsearchOutput;

export type NewBeatsOutput =
  | NewElasticsearchOutput
  | NewRemoteElasticsearchOutput
  | NewLogstashOutput
  | KafkaOutput;

// TODO: add `| NewOtlpOutput` when service-layer OTLP CRUD is activated in the follow-up PR
export type NewOutput = NewBeatsOutput;

export type UpdateOutput =
  | Partial<NewElasticsearchOutput>
  | Partial<NewRemoteElasticsearchOutput>
  | Partial<NewLogstashOutput>
  | Partial<KafkaOutput>
  | Partial<NewOtlpOutput>;

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

export interface KafkaOutput extends BeatsBaseOutput {
  type: OutputType['Kafka'];
  client_id?: string;
  version?: string;
  key?: string;
  compression?: ValueOf<KafkaCompressionType>;
  compression_level?: number | null;
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
  secrets?: KafkaOutputSecrets;
}

interface KafkaOutputSecrets extends BaseSSLSecrets {
  password?: SOSecret;
}
interface RemoteESOutputSecrets extends BaseSSLSecrets {
  service_token?: SOSecret;
}
