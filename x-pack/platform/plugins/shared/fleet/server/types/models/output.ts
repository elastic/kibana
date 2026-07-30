/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  kafkaAuthType,
  kafkaCompressionType,
  kafkaConnectionType,
  kafkaPartitionType,
  kafkaSaslMechanism,
  kafkaVerificationModes,
  MAX_HOSTS,
  otlpCompressionType,
  otlpProtocol,
  outputType,
} from '../../../common/constants';

export function validateLogstashHost(val: string) {
  if (val.match(/^http([s]){0,1}:\/\//)) {
    return 'Host address must begin with a domain name or IP address';
  }

  try {
    const url = new URL(`http://${val}`);

    if (url.host !== val.toLowerCase()) {
      return 'Invalid host';
    }
  } catch (err) {
    return 'Invalid Logstash host';
  }
}

export const validateKafkaHost = (input: string): string | undefined => {
  const parts = input.split(':');

  if (parts.length !== 2 || !parts[0] || parts[0].includes('://')) {
    return 'Invalid format. Expected "host:port" without protocol';
  }

  const port = parseInt(parts[1], 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return 'Invalid port number. Expected a number between 1 and 65535';
  }

  return undefined;
};

const secretRefSchema = schema.oneOf([
  schema.object({
    id: schema.string(),
    hash: schema.maybe(schema.string()),
  }),
  schema.string(),
]);

/**
 * Shared sub-schemas (extracted to avoid type explosion when variants become named components)
 */

const OutputSslSchema = schema.object(
  {
    certificate_authorities: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10 })),
    certificate: schema.maybe(schema.string()),
    key: schema.maybe(schema.string()),
    verification_mode: schema.maybe(
      schema.oneOf([
        schema.literal(kafkaVerificationModes.Full),
        schema.literal(kafkaVerificationModes.None),
        schema.literal(kafkaVerificationModes.Certificate),
        schema.literal(kafkaVerificationModes.Strict),
      ])
    ),
  },
  { meta: { id: 'output_ssl' } }
);

const OutputShipperSchema = schema.object(
  {
    disk_queue_enabled: schema.nullable(schema.boolean({ defaultValue: false })),
    disk_queue_path: schema.nullable(schema.string()),
    disk_queue_max_size: schema.nullable(schema.number()),
    disk_queue_encryption_enabled: schema.nullable(schema.boolean()),
    disk_queue_compression_enabled: schema.nullable(schema.boolean()),
    compression_level: schema.nullable(schema.number()),
    loadbalance: schema.nullable(schema.boolean()),
    mem_queue_events: schema.nullable(schema.number()),
    queue_flush_timeout: schema.nullable(schema.number()),
    max_batch_bytes: schema.nullable(schema.number()),
  },
  { meta: { id: 'output_shipper' } }
);

const OutputResponseSslSchema = OutputSslSchema.extends(
  {},
  { meta: { id: 'output_response_ssl' } }
);

const OutputResponseShipperSchema = OutputShipperSchema.extends(
  {},
  { meta: { id: 'output_response_shipper' } }
);

/**
 * Base schemas
 */

const BaseSchema = {
  id: schema.maybe(schema.string()),
  name: schema.string(),
  is_default: schema.boolean({ defaultValue: false }),
  is_default_monitoring: schema.boolean({ defaultValue: false }),
  is_internal: schema.maybe(schema.boolean()),
  is_preconfigured: schema.maybe(schema.boolean()),
  ca_sha256: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  ca_trusted_fingerprint: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  config_yaml: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  otel_exporter_config_yaml: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  otel_disable_beatsauth: schema.maybe(schema.oneOf([schema.literal(null), schema.boolean()])),
  ssl: schema.maybe(schema.oneOf([schema.literal(null), OutputSslSchema])),
  proxy_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  shipper: schema.maybe(schema.oneOf([schema.literal(null), OutputShipperSchema])),
  allow_edit: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1000 })),
  secrets: schema.maybe(
    schema.object({
      ssl: schema.maybe(schema.object({ key: schema.maybe(secretRefSchema) })),
    })
  ),
};

const UpdateSchema = {
  ...BaseSchema,
  name: schema.maybe(schema.string()),
  is_default: schema.maybe(schema.boolean()),
  is_default_monitoring: schema.maybe(schema.boolean()),
};

const PresetSchema = schema.oneOf([
  schema.literal('balanced'),
  schema.literal('custom'),
  schema.literal('throughput'),
  schema.literal('scale'),
  schema.literal('latency'),
]);

/**
 * Elasticsearch schemas
 */

export const ElasticSearchSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Elasticsearch),
  hosts: schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
    minSize: 1,
    maxSize: MAX_HOSTS,
  }),
  preset: schema.maybe(PresetSchema),
  write_to_logs_streams: schema.maybe(schema.oneOf([schema.literal(null), schema.boolean()])),
};

const ElasticSearchUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Elasticsearch)),
  hosts: schema.maybe(
    schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
      minSize: 1,
      maxSize: MAX_HOSTS,
    })
  ),
  preset: schema.maybe(PresetSchema),
  write_to_logs_streams: schema.maybe(schema.oneOf([schema.literal(null), schema.boolean()])),
};

/**
 * Remote Elasticsearch schemas
 */

export const RemoteElasticSearchSchema = {
  ...ElasticSearchSchema,
  type: schema.literal(outputType.RemoteElasticsearch),
  service_token: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  secrets: schema.maybe(
    schema.object({
      service_token: schema.maybe(secretRefSchema),
      ssl: schema.maybe(schema.object({ key: schema.maybe(secretRefSchema) })),
    })
  ),
  sync_integrations: schema.maybe(schema.boolean()),
  kibana_url: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  kibana_api_key: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  sync_uninstalled_integrations: schema.maybe(schema.boolean()),
};

const RemoteElasticSearchUpdateSchema = {
  ...ElasticSearchUpdateSchema,
  type: schema.maybe(schema.literal(outputType.RemoteElasticsearch)),
  service_token: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  secrets: schema.maybe(
    schema.object({
      service_token: schema.maybe(secretRefSchema),
      ssl: schema.maybe(schema.object({ key: schema.maybe(secretRefSchema) })),
    })
  ),
  sync_integrations: schema.maybe(schema.boolean()),
  kibana_url: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  kibana_api_key: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  sync_uninstalled_integrations: schema.maybe(schema.boolean()),
};

/**
 * Logstash schemas
 */

export const LogstashSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Logstash),
  hosts: schema.arrayOf(schema.string({ validate: validateLogstashHost }), {
    minSize: 1,
    maxSize: MAX_HOSTS,
  }),
};

const LogstashUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Logstash)),
  hosts: schema.maybe(
    schema.arrayOf(schema.string({ validate: validateLogstashHost }), {
      minSize: 1,
      maxSize: MAX_HOSTS,
    })
  ),
  secrets: schema.maybe(
    schema.object({
      ssl: schema.maybe(schema.object({ key: schema.maybe(secretRefSchema) })),
    })
  ),
};

export const KafkaSchema = {
  ...BaseSchema,
  // Kafka does not support proxies. proxy_id is accepted to avoid breaking existing preconfigured
  // outputs but is silently cleared to null on save and never written into the compiled agent
  // policy (#267281). Marked deprecated so API consumers are not misled.
  proxy_id: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string()], {
      meta: {
        deprecated: true,
        description:
          'Kafka outputs do not support proxy configuration. This field is accepted for backwards compatibility but is ignored — it is cleared to null on save and has no effect on the compiled agent policy.',
      },
    })
  ),
  type: schema.literal(outputType.Kafka),
  hosts: schema.arrayOf(schema.string({ validate: validateKafkaHost }), {
    minSize: 1,
    maxSize: MAX_HOSTS,
  }),
  version: schema.maybe(schema.string()),
  key: schema.maybe(schema.string()),
  compression: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaCompressionType.Gzip),
      schema.literal(kafkaCompressionType.Snappy),
      schema.literal(kafkaCompressionType.Lz4),
      schema.literal(kafkaCompressionType.None),
    ])
  ),
  compression_level: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
  client_id: schema.maybe(schema.string()),
  auth_type: schema.oneOf([
    schema.literal(kafkaAuthType.None),
    schema.literal(kafkaAuthType.Userpass),
    schema.literal(kafkaAuthType.Ssl),
    schema.literal(kafkaAuthType.Kerberos),
  ]),
  connection_type: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaConnectionType.Plaintext),
      schema.literal(kafkaConnectionType.Encryption),
    ])
  ),
  username: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  password: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  sasl: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.object({
        mechanism: schema.maybe(
          schema.oneOf([
            schema.literal(kafkaSaslMechanism.Plain),
            schema.literal(kafkaSaslMechanism.ScramSha256),
            schema.literal(kafkaSaslMechanism.ScramSha512),
          ])
        ),
      }),
    ])
  ),
  partition: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaPartitionType.Random),
      schema.literal(kafkaPartitionType.RoundRobin),
      schema.literal(kafkaPartitionType.Hash),
    ])
  ),
  random: schema.maybe(schema.object({ group_events: schema.maybe(schema.number()) })),
  round_robin: schema.maybe(schema.object({ group_events: schema.maybe(schema.number()) })),
  hash: schema.maybe(
    schema.object({ hash: schema.maybe(schema.string()), random: schema.maybe(schema.boolean()) })
  ),
  topic: schema.maybe(schema.string()),
  headers: schema.maybe(
    schema.arrayOf(schema.object({ key: schema.string(), value: schema.string() }), {
      maxSize: 100,
    })
  ),
  timeout: schema.maybe(schema.number()),
  broker_timeout: schema.maybe(schema.number()),
  required_acks: schema.maybe(
    schema.oneOf([schema.literal(1), schema.literal(0), schema.literal(-1)])
  ),
  secrets: schema.maybe(
    schema.object({
      password: schema.maybe(secretRefSchema),
      ssl: schema.maybe(schema.object({ key: secretRefSchema })),
    })
  ),
};

const KafkaUpdateSchema = {
  ...UpdateSchema,
  ...KafkaSchema,
  type: schema.maybe(schema.literal(outputType.Kafka)),
  hosts: schema.maybe(
    schema.arrayOf(schema.string({ validate: validateKafkaHost }), {
      minSize: 1,
      maxSize: MAX_HOSTS,
    })
  ),
  auth_type: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaAuthType.None),
      schema.literal(kafkaAuthType.Userpass),
      schema.literal(kafkaAuthType.Ssl),
      schema.literal(kafkaAuthType.Kerberos),
    ])
  ),
};

/**
 * OTLP schemas
 */

const OtlpExporterTlsSchema = schema.object({
  insecure: schema.maybe(schema.boolean()),
  insecure_skip_verify: schema.maybe(schema.boolean()),
  ca_pem: schema.maybe(schema.string()),
  cert_pem: schema.maybe(schema.string()),
  key_pem: schema.maybe(schema.string()),
  include_system_ca_certs_pool: schema.maybe(schema.boolean()),
  min_version: schema.maybe(schema.string()),
  max_version: schema.maybe(schema.string()),
  reload_interval: schema.maybe(schema.string()),
  server_name_override: schema.maybe(schema.string()),
  cipher_suites: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  curve_preferences: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('X25519'),
        schema.literal('P521'),
        schema.literal('P256'),
        schema.literal('P384'),
      ]),
      { maxSize: 4 }
    )
  ),
});

const OtlpExporterSendingQueueSchema = schema.object({
  enabled: schema.maybe(schema.boolean()),
  num_consumers: schema.maybe(schema.number()),
  queue_size: schema.maybe(schema.number()),
  sizer: schema.maybe(
    schema.oneOf([schema.literal('requests'), schema.literal('items'), schema.literal('bytes')])
  ),
  wait_for_result: schema.maybe(schema.boolean()),
  block_on_overflow: schema.maybe(schema.boolean()),
  batch: schema.maybe(
    schema.object({
      flush_timeout: schema.maybe(schema.string()),
      min_size: schema.maybe(schema.number()),
      max_size: schema.maybe(schema.number()),
      sizer: schema.maybe(schema.oneOf([schema.literal('items'), schema.literal('bytes')])),
      partition: schema.maybe(
        schema.object({
          metadata_keys: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
        })
      ),
    })
  ),
});

const OtlpExporterRetrySchema = schema.object({
  enabled: schema.maybe(schema.boolean()),
  initial_interval: schema.maybe(schema.string()),
  max_interval: schema.maybe(schema.string()),
  max_elapsed_time: schema.maybe(schema.string()),
  multiplier: schema.maybe(schema.number()),
});

const OtlpExporterBaseSchema = {
  endpoint: schema.string(),
  api_key: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  headers: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  timeout: schema.maybe(schema.string()),
  tls: schema.maybe(OtlpExporterTlsSchema),
  sending_queue: schema.maybe(OtlpExporterSendingQueueSchema),
  retry_on_failure: schema.maybe(OtlpExporterRetrySchema),
};

const OtlpGrpcExporterSchema = schema.object({
  ...OtlpExporterBaseSchema,
  protocol: schema.literal(otlpProtocol.Grpc),
  compression: schema.maybe(
    schema.oneOf([
      schema.literal(otlpCompressionType.Gzip),
      schema.literal(otlpCompressionType.Snappy),
      schema.literal(otlpCompressionType.Zstd),
      schema.literal(otlpCompressionType.None),
    ])
  ),
  balancer_name: schema.maybe(schema.string()),
  keepalive: schema.maybe(
    schema.object({
      time: schema.maybe(schema.string()),
      timeout: schema.maybe(schema.string()),
      permit_without_stream: schema.maybe(schema.boolean()),
    })
  ),
  read_buffer_size: schema.maybe(schema.number()),
  write_buffer_size: schema.maybe(schema.number()),
});

const OtlpHttpExporterSchema = schema.object({
  ...OtlpExporterBaseSchema,
  protocol: schema.literal(otlpProtocol.HttpProtobuf),
  compression: schema.maybe(
    schema.oneOf([
      schema.literal(otlpCompressionType.Gzip),
      schema.literal(otlpCompressionType.None),
    ])
  ),
  encoding: schema.maybe(schema.oneOf([schema.literal('proto'), schema.literal('json')])),
  traces_endpoint: schema.maybe(schema.string()),
  metrics_endpoint: schema.maybe(schema.string()),
  logs_endpoint: schema.maybe(schema.string()),
  profiles_endpoint: schema.maybe(schema.string()),
  read_buffer_size: schema.maybe(schema.number()),
  write_buffer_size: schema.maybe(schema.number()),
});

const OtlpExporterSchema = schema.discriminatedUnion('protocol', [
  OtlpGrpcExporterSchema,
  OtlpHttpExporterSchema,
]);

const OtlpSecretsSchema = schema.maybe(
  schema.object({
    api_key: schema.maybe(secretRefSchema),
    otlp_exporter: schema.maybe(
      schema.object({
        tls: schema.maybe(
          schema.object({
            key_pem: schema.maybe(secretRefSchema),
          })
        ),
      })
    ),
  })
);

export const OtlpSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Otlp),
  api_key: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  otlp_exporter: OtlpExporterSchema,
  secrets: OtlpSecretsSchema,
};

export const OtlpUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Otlp)),
  api_key: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  otlp_exporter: schema.maybe(OtlpExporterSchema),
  secrets: OtlpSecretsSchema,
};

// TODO: uncomment OtlpSchema entries in each union below when service-layer OTLP CRUD is
// activated in the follow-up PR.
export const OutputSchema = schema.discriminatedUnion('type', [
  schema.object({ ...ElasticSearchSchema }, { meta: { id: 'output_elasticsearch' } }),
  schema.object({ ...RemoteElasticSearchSchema }, { meta: { id: 'output_remote_elasticsearch' } }),
  schema.object({ ...LogstashSchema }, { meta: { id: 'output_logstash' } }),
  schema.object({ ...KafkaSchema }, { meta: { id: 'output_kafka' } }),
  // schema.object({ ...OtlpSchema }, { meta: { id: 'output_otlp' } }),
]);

// Separate schema for create operations: uses distinct meta IDs so OAS codegen
// emits named $ref components instead of inline anyOf members, which the
// Terraform provider requires to distinguish create vs read types.
export const NewOutputSchema = schema.discriminatedUnion('type', [
  schema.object({ ...ElasticSearchSchema }, { meta: { id: 'new_output_elasticsearch' } }),
  schema.object(
    { ...RemoteElasticSearchSchema },
    { meta: { id: 'new_output_remote_elasticsearch' } }
  ),
  schema.object({ ...LogstashSchema }, { meta: { id: 'new_output_logstash' } }),
  schema.object({ ...KafkaSchema }, { meta: { id: 'new_output_kafka' } }),
  // schema.object({ ...OtlpSchema }, { meta: { id: 'new_output_otlp' } }),
]);

const OutputResponseSharedSchema = {
  ssl: schema.maybe(schema.oneOf([schema.literal(null), OutputResponseSslSchema])),
  shipper: schema.maybe(schema.oneOf([schema.literal(null), OutputResponseShipperSchema])),
};

export const OutputResponseItemSchema = schema
  .discriminatedUnion('type', [
    schema.object(
      { ...ElasticSearchSchema, ...OutputResponseSharedSchema },
      { meta: { id: 'output_response_elasticsearch' } }
    ),
    schema.object(
      { ...RemoteElasticSearchSchema, ...OutputResponseSharedSchema },
      { meta: { id: 'output_response_remote_elasticsearch' } }
    ),
    schema.object(
      { ...LogstashSchema, ...OutputResponseSharedSchema },
      { meta: { id: 'output_response_logstash' } }
    ),
    schema.object(
      { ...KafkaSchema, ...OutputResponseSharedSchema },
      { meta: { id: 'output_response_kafka' } }
    ),
    // schema.object({ ...OtlpSchema }, { meta: { id: 'output_response_otlp' } }),
  ])
  .extendsDeep({
    unknowns: 'allow',
  });

export const OutputResponseSchema = schema.object({
  item: OutputResponseItemSchema,
});

export const UpdateOutputSchema = schema.oneOf([
  schema.object({ ...ElasticSearchUpdateSchema }, { meta: { id: 'update_output_elasticsearch' } }),
  schema.object(
    { ...RemoteElasticSearchUpdateSchema },
    { meta: { id: 'update_output_remote_elasticsearch' } }
  ),
  schema.object({ ...LogstashUpdateSchema }, { meta: { id: 'update_output_logstash' } }),
  schema.object({ ...KafkaUpdateSchema }, { meta: { id: 'update_output_kafka' } }),
  // schema.object({ ...OtlpUpdateSchema }, { meta: { id: 'update_output_otlp' } }),
]);
