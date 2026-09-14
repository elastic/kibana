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
  allow_edit: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 1000 })),
};

const BeatsBaseSchema = {
  ...BaseSchema,
  ca_sha256: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  ca_trusted_fingerprint: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  config_yaml: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  otel_exporter_config_yaml: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  otel_disable_beatsauth: schema.maybe(schema.oneOf([schema.literal(null), schema.boolean()])),
  proxy_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  ssl: schema.maybe(schema.oneOf([schema.literal(null), OutputSslSchema])),
  shipper: schema.maybe(schema.oneOf([schema.literal(null), OutputShipperSchema])),
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

const BeatsUpdateSchema = {
  ...BeatsBaseSchema,
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
  ...BeatsBaseSchema,
  type: schema.literal(outputType.Elasticsearch),
  hosts: schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
    minSize: 1,
    maxSize: MAX_HOSTS,
  }),
  preset: schema.maybe(PresetSchema),
  write_to_logs_streams: schema.maybe(schema.oneOf([schema.literal(null), schema.boolean()])),
};

const ElasticSearchUpdateSchema = {
  ...BeatsUpdateSchema,
  type: schema.maybe(schema.literal(outputType.Elasticsearch)),
  hosts: schema.maybe(
    schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), { minSize: 1, maxSize: MAX_HOSTS })
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
  ...BeatsBaseSchema,
  type: schema.literal(outputType.Logstash),
  hosts: schema.arrayOf(schema.string({ validate: validateLogstashHost }), {
    minSize: 1,
    maxSize: MAX_HOSTS,
  }),
};

const LogstashUpdateSchema = {
  ...BeatsUpdateSchema,
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
  ...BeatsBaseSchema,
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
  ...BeatsUpdateSchema,
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
 * OTLP schemas — field shapes match otelcol v0.155.0, pinned in elastic-agent/internal/edot/go.mod.
 * Spec root: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.155.0/exporter/otlpexporter/config.go
 */

// Validated against otelcol v0.155.0:
//   gRPC: exporter/otlpexporter/config.go + go.opentelemetry.io/collector/config/configgrpc
//   HTTP: exporter/otlphttpexporter/config.go + go.opentelemetry.io/collector/config/confighttp
// Deliberate exclusions: auth/middlewares (extension refs), sending_queue.storage (agent-managed).
// TLS credentials (key_pem, tpm.owner_auth, tpm.auth) are accepted only via secrets.otlp_exporter.tls.*.
const OtlpExporterTlsSchema = schema.object({
  insecure: schema.maybe(schema.boolean()),
  insecure_skip_verify: schema.maybe(schema.boolean()),
  ca_pem: schema.maybe(schema.oneOf([schema.literal(null), schema.string({ maxLength: 65536 })])),
  cert_pem: schema.maybe(schema.oneOf([schema.literal(null), schema.string({ maxLength: 65536 })])),
  ca_file: schema.maybe(schema.oneOf([schema.literal(null), schema.string({ maxLength: 4096 })])),
  cert_file: schema.maybe(schema.oneOf([schema.literal(null), schema.string({ maxLength: 4096 })])),
  key_file: schema.maybe(schema.oneOf([schema.literal(null), schema.string({ maxLength: 4096 })])),
  include_system_ca_certs_pool: schema.maybe(schema.boolean()),
  include_insecure_cipher_suites: schema.maybe(schema.boolean()),
  min_version: schema.maybe(schema.oneOf([schema.literal(null), schema.string({ maxLength: 10 })])),
  max_version: schema.maybe(schema.oneOf([schema.literal(null), schema.string({ maxLength: 10 })])),
  reload_interval: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
  ),
  server_name_override: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string({ maxLength: 256 })])
  ),
  cipher_suites: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 100 }),
    ])
  ),
  curve_preferences: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.arrayOf(
        schema.oneOf([
          schema.literal('X25519'),
          schema.literal('P521'),
          schema.literal('P256'),
          schema.literal('P384'),
        ]),
        { maxSize: 4 }
      ),
    ])
  ),
  tpm: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.object({
        enabled: schema.maybe(schema.boolean()),
        path: schema.maybe(
          schema.oneOf([schema.literal(null), schema.string({ maxLength: 4096 })])
        ),
      }),
    ])
  ),
});

const OtlpExporterSendingQueueSchema = schema.object({
  enabled: schema.maybe(schema.boolean()),
  num_consumers: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
  queue_size: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
  sizer: schema.maybe(
    schema.oneOf([schema.literal('requests'), schema.literal('items'), schema.literal('bytes')])
  ),
  wait_for_result: schema.maybe(schema.boolean()),
  block_on_overflow: schema.maybe(schema.boolean()),
  batch: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.object({
        flush_timeout: schema.maybe(
          schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
        ),
        min_size: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
        max_size: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
        sizer: schema.maybe(schema.oneOf([schema.literal('items'), schema.literal('bytes')])),
        partition: schema.maybe(
          schema.oneOf([
            schema.literal(null),
            schema.object({
              metadata_keys: schema.maybe(
                schema.oneOf([
                  schema.literal(null),
                  schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 100 }),
                ])
              ),
            }),
          ])
        ),
      }),
    ])
  ),
});

const OtlpExporterRetrySchema = schema.object({
  enabled: schema.maybe(schema.boolean()),
  initial_interval: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
  ),
  randomization_factor: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
  multiplier: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
  max_interval: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
  ),
  max_elapsed_time: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
  ),
});

const OtlpExporterBaseSchema = {
  endpoint: schema.string({ maxLength: 2048 }),
  headers: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.recordOf(schema.string({ maxLength: 256 }), schema.string({ maxLength: 1000 })),
    ])
  ),
  timeout: schema.maybe(schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])),
  tls: schema.maybe(schema.oneOf([schema.literal(null), OtlpExporterTlsSchema])),
  sending_queue: schema.maybe(schema.oneOf([schema.literal(null), OtlpExporterSendingQueueSchema])),
  retry_on_failure: schema.maybe(schema.oneOf([schema.literal(null), OtlpExporterRetrySchema])),
};

const OtlpGrpcExporterSchema = schema.object(
  {
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
    balancer_name: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 256 })])
    ),
    keepalive: schema.maybe(
      schema.oneOf([
        schema.literal(null),
        schema.object({
          time: schema.maybe(
            schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
          ),
          timeout: schema.maybe(
            schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
          ),
          permit_without_stream: schema.maybe(schema.boolean()),
        }),
      ])
    ),
    read_buffer_size: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
    write_buffer_size: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
    wait_for_ready: schema.maybe(schema.boolean()),
    user_agent: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 256 })])
    ),
    authority: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 256 })])
    ),
  },
  { meta: { id: 'otlp_grpc_exporter' } }
);

const OtlpHttpExporterSchema = schema.object(
  {
    ...OtlpExporterBaseSchema,
    protocol: schema.literal(otlpProtocol.HttpProtobuf),
    compression: schema.maybe(
      schema.oneOf([
        schema.literal(otlpCompressionType.Gzip),
        schema.literal(otlpCompressionType.None),
      ])
    ),
    encoding: schema.maybe(schema.oneOf([schema.literal('proto'), schema.literal('json')])),
    traces_endpoint: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 2048 })])
    ),
    metrics_endpoint: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 2048 })])
    ),
    logs_endpoint: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 2048 })])
    ),
    profiles_endpoint: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 2048 })])
    ),
    read_buffer_size: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
    write_buffer_size: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
    proxy_url: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 2048 })])
    ),
    max_idle_conns: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
    max_idle_conns_per_host: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
    max_conns_per_host: schema.maybe(schema.oneOf([schema.literal(null), schema.number()])),
    idle_conn_timeout: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
    ),
    disable_keep_alives: schema.maybe(schema.boolean()),
    http2_read_idle_timeout: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
    ),
    http2_ping_timeout: schema.maybe(
      schema.oneOf([schema.literal(null), schema.string({ maxLength: 64 })])
    ),
    force_attempt_http2: schema.maybe(schema.boolean()),
    compression_params: schema.maybe(
      schema.oneOf([schema.literal(null), schema.object({ level: schema.maybe(schema.number()) })])
    ),
    cookies: schema.maybe(
      schema.oneOf([
        schema.literal(null),
        schema.object({ enabled: schema.maybe(schema.boolean()) }),
      ])
    ),
  },
  { meta: { id: 'otlp_http_exporter' } }
);

const OtlpExporterSchema = schema.discriminatedUnion('protocol', [
  OtlpGrpcExporterSchema,
  OtlpHttpExporterSchema,
]);

const OtlpGrpcExporterResponseSchema = OtlpGrpcExporterSchema.extends(
  {},
  { meta: { id: 'otlp_response_grpc_exporter' } }
);
const OtlpHttpExporterResponseSchema = OtlpHttpExporterSchema.extends(
  {},
  { meta: { id: 'otlp_response_http_exporter' } }
);
const OtlpExporterResponseSchema = schema.discriminatedUnion('protocol', [
  OtlpGrpcExporterResponseSchema,
  OtlpHttpExporterResponseSchema,
]);

const OtlpSecretsSchema = schema.maybe(
  schema.object({
    otlp_exporter: schema.maybe(
      schema.object({
        tls: schema.maybe(
          schema.object({
            key_pem: schema.maybe(secretRefSchema),
            tpm: schema.maybe(
              schema.object({
                owner_auth: schema.maybe(secretRefSchema),
                auth: schema.maybe(secretRefSchema),
              })
            ),
          })
        ),
      })
    ),
  })
);

export const OtlpSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Otlp),
  otlp_exporter: OtlpExporterSchema,
  secrets: OtlpSecretsSchema,
};

const OtlpResponseSchema = {
  ...OtlpSchema,
  otlp_exporter: schema.maybe(OtlpExporterResponseSchema),
};

export const OtlpUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Otlp)),
  otlp_exporter: schema.maybe(OtlpExporterSchema),
  secrets: OtlpSecretsSchema,
};

export const OutputSchema = schema.discriminatedUnion('type', [
  schema.object({ ...ElasticSearchSchema }, { meta: { id: 'output_elasticsearch' } }),
  schema.object({ ...RemoteElasticSearchSchema }, { meta: { id: 'output_remote_elasticsearch' } }),
  schema.object({ ...LogstashSchema }, { meta: { id: 'output_logstash' } }),
  schema.object({ ...KafkaSchema }, { meta: { id: 'output_kafka' } }),
  schema.object({ ...OtlpSchema }, { meta: { id: 'output_otlp' } }),
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
  schema.object({ ...OtlpSchema }, { meta: { id: 'new_output_otlp' } }),
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
    schema.object({ ...OtlpResponseSchema }, { meta: { id: 'output_response_otlp' } }),
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
  schema.object({ ...OtlpUpdateSchema }, { meta: { id: 'update_output_otlp' } }),
]);
