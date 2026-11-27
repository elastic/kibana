/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Type } from '@kbn/config-schema';

import {
  kafkaAuthType,
  kafkaCompressionType,
  kafkaConnectionType,
  kafkaKerberosAuthType,
  kafkaOAuth2GrantType,
  kafkaOAuth2SignatureAlgorithm,
  kafkaPartitionType,
  kafkaSaslMechanism,
  kafkaVerificationModes,
  KAFKA_KERBEROS_USERNAME_MAX_LENGTH,
  MAX_HOSTS,
  otlpAuthScheme,
  otlpAuthType,
  otlpAzureAuthMethod,
  otlpCompressionType,
  otlpProtocol,
  outputType,
} from '../../../common/constants';
import {
  isValidOtlpHeaderName,
  OTLP_AUTH_CREDENTIAL_MAX_LENGTH,
  OTLP_HEADER_NAME_MAX_LENGTH,
} from '../../../common/services/otlp_auth';

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

// an update removes a secret by setting it to `null`: leaving it out keeps the saved one
const nullableSecretRefSchema = schema.oneOf([
  schema.literal(null),
  schema.object({
    id: schema.string(),
    hash: schema.maybe(schema.string()),
  }),
  schema.string(),
]);

const BeatsUpdateSecretsSchema = schema.maybe(
  schema.object({
    ssl: schema.maybe(schema.object({ key: schema.maybe(nullableSecretRefSchema) })),
  })
);

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
  secrets: BeatsUpdateSecretsSchema,
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
      service_token: schema.maybe(nullableSecretRefSchema),
      ssl: schema.maybe(schema.object({ key: schema.maybe(nullableSecretRefSchema) })),
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
};

// 1 day. The agent is given the durations in nanoseconds, so this also keeps them safe integers.
const MAX_OAUTH2_DURATION_SECONDS = 86400;

/**
 * Settings of the OAuth2 authentication method, they follow the `oauth2clientauthextension` of the
 * OpenTelemetry collector. The client secret and the client certificate key are in `secrets`.
 * The `*_file` settings are paths on the host of the agent.
 */
const KafkaOAuth2Schema = schema.object({
  grant_type: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaOAuth2GrantType.ClientCredentials),
      schema.literal(kafkaOAuth2GrantType.JwtBearer),
    ])
  ),
  client_id: schema.maybe(schema.string()),
  client_id_file: schema.maybe(schema.string()),
  client_secret_file: schema.maybe(schema.string()),
  token_url: schema.string({ minLength: 1 }),
  scopes: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  // url.Values of the agent: every parameter takes a list of values
  endpoint_params: schema.maybe(
    schema.recordOf(schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 }))
  ),
  tls: schema.maybe(
    schema.object({
      ca_file: schema.maybe(schema.string()),
      cert_file: schema.maybe(schema.string()),
      key_file: schema.maybe(schema.string()),
      insecure_skip_verify: schema.maybe(schema.boolean()),
      server_name_override: schema.maybe(schema.string()),
      min_version: schema.maybe(schema.string()),
      max_version: schema.maybe(schema.string()),
    })
  ),
  // in seconds, the agent is given them in nanoseconds
  timeout: schema.maybe(
    schema.number({
      min: 0,
      max: MAX_OAUTH2_DURATION_SECONDS,
      meta: {
        description:
          'How long, in seconds, a request to the token endpoint can take before it times out. There is no limit when it is not set.',
      },
    })
  ),
  expiry_buffer: schema.maybe(
    schema.number({
      min: 0,
      max: MAX_OAUTH2_DURATION_SECONDS,
      meta: {
        description:
          "How many seconds before a token's expiry the agent requests a new one. It defaults to `300` when not set.",
      },
    })
  ),
  // jwt-bearer grant only
  client_certificate_key_id: schema.maybe(schema.string()),
  client_certificate_key_file: schema.maybe(schema.string()),
  signature_algorithm: schema.maybe(
    schema.oneOf([
      schema.literal(kafkaOAuth2SignatureAlgorithm.Rs256),
      schema.literal(kafkaOAuth2SignatureAlgorithm.Rs384),
      schema.literal(kafkaOAuth2SignatureAlgorithm.Rs512),
    ])
  ),
  iss: schema.maybe(schema.string()),
  audience: schema.maybe(schema.string()),
  claims: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

/**
 * Settings of the Kerberos authentication method, they follow the `kerberos` settings of the Kafka
 * output of Beats. The password is in `secrets`. The paths are paths on the host of the agent.
 */
const KafkaKerberosSchema = schema.object({
  auth_type: schema.oneOf(
    [schema.literal(kafkaKerberosAuthType.Keytab), schema.literal(kafkaKerberosAuthType.Password)],
    {
      meta: {
        description:
          'How the agent authenticates with Kerberos: a keytab file, or a username and password.',
      },
    }
  ),
  config_path: schema.string({
    minLength: 1,
    meta: {
      description: 'Path to the Kerberos configuration file (`krb5.conf`) on the agent host.',
    },
  }),
  keytab: schema.maybe(
    schema.string({
      meta: {
        description:
          'Path to the keytab file on the agent host. Required when `auth_type` is `keytab`.',
      },
    })
  ),
  username: schema.string({
    minLength: 1,
    maxLength: KAFKA_KERBEROS_USERNAME_MAX_LENGTH,
    meta: {
      description:
        'Kerberos username (the principal). Required. When `auth_type` is `keytab`, it is the principal to look up in the keytab file; when it is `password`, the password is set in `secrets.kerberos.password`.',
    },
  }),
  service_name: schema.maybe(
    schema.string({ meta: { description: 'Kerberos service name of the Kafka brokers.' } })
  ),
  realm: schema.string({
    minLength: 1,
    meta: { description: 'Kerberos realm. This is usually the domain name in uppercase.' },
  }),
  enable_krb5_fast: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'Whether to use Kerberos FAST authentication. This can conflict with some Active Directory installations. It defaults to `false` when not set.',
      },
    })
  ),
});

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
    schema.literal(kafkaAuthType.OAuth2),
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
  oauth2: schema.maybe(schema.oneOf([schema.literal(null), KafkaOAuth2Schema])),
  kerberos: schema.maybe(schema.oneOf([schema.literal(null), KafkaKerberosSchema])),
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
      oauth2: schema.maybe(
        schema.object({
          client_secret: schema.maybe(secretRefSchema),
          client_certificate_key: schema.maybe(secretRefSchema),
        })
      ),
      kerberos: schema.maybe(schema.object({ password: schema.maybe(secretRefSchema) })),
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
      schema.literal(kafkaAuthType.OAuth2),
    ])
  ),
  secrets: schema.maybe(
    schema.object({
      password: schema.maybe(nullableSecretRefSchema),
      ssl: schema.maybe(schema.object({ key: nullableSecretRefSchema })),
      oauth2: schema.maybe(
        schema.object({
          client_secret: schema.maybe(secretRefSchema),
          client_certificate_key: schema.maybe(secretRefSchema),
        })
      ),
      kerberos: schema.maybe(schema.object({ password: schema.maybe(secretRefSchema) })),
    })
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

// A setting that takes a value, or `null` to remove a stored value.
const nullable = <T>(type: Type<T>, description: string) =>
  schema.maybe(schema.oneOf([schema.literal(null), type], { meta: { description } }));

const OtlpExporterSendingQueueSchema = schema.object({
  enabled: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether the exporter uses a sending queue. Default: `true`.' },
    })
  ),
  num_consumers: nullable(
    schema.number(),
    'Number of consumers that send the data of the queue. Default: `10`.'
  ),
  queue_size: nullable(
    schema.number(),
    'Maximum size of the queue, in the unit of `sizer`. Default: `1000`, or `50000000` on the managed OTLP endpoint when `sizer` is `bytes`.'
  ),
  sizer: schema.maybe(
    schema.oneOf([schema.literal('requests'), schema.literal('items'), schema.literal('bytes')], {
      meta: {
        description:
          'Unit of `queue_size`. Default: `requests`, or `bytes` on the managed OTLP endpoint.',
      },
    })
  ),
  wait_for_result: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'Whether incoming requests are blocked until they are processed. Default: `false`.',
      },
    })
  ),
  block_on_overflow: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'Whether incoming requests are blocked when the queue is full, instead of rejected. Default: `false`, or `true` on the managed OTLP endpoint.',
      },
    })
  ),
  batch: nullable(
    schema.object({
      flush_timeout: nullable(
        schema.string({ maxLength: 64 }),
        'Time after which a batch is sent, whatever its size. Default: `200ms`, or `1s` on the managed OTLP endpoint.'
      ),
      min_size: nullable(
        schema.number(),
        'Minimum size of a batch, in the unit of the batch `sizer`. Default: `8192`, or `1000000` on the managed OTLP endpoint.'
      ),
      max_size: nullable(
        schema.number(),
        'Maximum size of a batch, `0` for no maximum. Default: `0`, or `4000000` on the managed OTLP endpoint.'
      ),
      sizer: schema.maybe(
        schema.oneOf([schema.literal('items'), schema.literal('bytes')], {
          meta: {
            description:
              'Unit of the batch sizes. Default: the unit of the queue, `items` for a queue that counts requests, or `bytes` on the managed OTLP endpoint.',
          },
        })
      ),
      partition: nullable(
        schema.object({
          metadata_keys: nullable(
            schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 100 }),
            'Client metadata keys used to batch data separately.'
          ),
        }),
        'Batches data separately by client metadata.'
      ),
    }),
    'Batching of the queue. An empty object batches with the defaults. Set to `null` to turn batching off.'
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
  sending_queue: nullable(
    OtlpExporterSendingQueueSchema,
    'The sending queue of the exporter. Set to `null` to use the collector defaults for the whole queue. In an update, a setting that is left out keeps its stored value, and a setting that accepts `null` is reset to its default when set to `null`. To change `enabled`, `sizer`, `wait_for_result`, `block_on_overflow` or `batch.sizer`, send the value you want. On the managed OTLP endpoint, a setting that is reset, or that has no value, gets the Elastic default. Set `batch` to `null` to turn batching off.'
  ),
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

export function validateOtlpHeaderName(name: string): string | undefined {
  if (!isValidOtlpHeaderName(name)) {
    return "Invalid header name. It can only contain letters, digits and !#$%&'*+-.^_`|~";
  }
}

const OtlpAuthHeaderSchema = schema.object(
  {
    type: schema.literal(otlpAuthType.AuthHeader),
    scheme: schema.oneOf(
      [schema.literal(otlpAuthScheme.ApiKey), schema.literal(otlpAuthScheme.BearerToken)],
      {
        meta: {
          description:
            'The scheme of the `Authorization` header: `api_key` sends `ApiKey <credential>`, `bearer_token` sends `Bearer <credential>`.',
        },
      }
    ),
  },
  { meta: { id: 'otlp_auth_header' } }
);

const OtlpCustomAuthHeaderSchema = schema.object(
  {
    type: schema.literal(otlpAuthType.CustomHeader),
    name: schema.string({
      minLength: 1,
      maxLength: OTLP_HEADER_NAME_MAX_LENGTH,
      validate: validateOtlpHeaderName,
      meta: { description: 'The name of the header that is sent with the credential as value.' },
    }),
  },
  { meta: { id: 'otlp_custom_auth_header' } }
);

// Microsoft Entra ID ids are GUIDs, a tenant can also be given by one of its domain names
const OTLP_AZURE_ID_MAX_LENGTH = 256;
const OTLP_AZURE_SCOPE_MAX_LENGTH = 2048;
// a token is issued for a single resource: a managed identity requires exactly one scope, and
// Microsoft Entra ID rejects a client credentials request for several resources
const OTLP_AZURE_SCOPES_MAX_SIZE = 1;

const OtlpAzureAuthSchema = schema.object(
  {
    type: schema.literal(otlpAuthType.Azure),
    azure_auth_method: schema.oneOf(
      [
        schema.literal(otlpAzureAuthMethod.ManagedIdentity),
        schema.literal(otlpAzureAuthMethod.ServicePrincipal),
      ],
      {
        meta: {
          description:
            'How the collector gets the Microsoft Entra ID token: `managed_identity` uses the managed identity of the Azure resource the agent runs on, `service_principal` uses an application registration and its client secret, set in `secrets.auth.azure_client_secret`.',
        },
      }
    ),
    client_id: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: OTLP_AZURE_ID_MAX_LENGTH,
        meta: {
          description:
            'The client id of the service principal, required for it. For a managed identity, the client id of a user-assigned identity, left out for the system-assigned one.',
        },
      })
    ),
    tenant_id: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: OTLP_AZURE_ID_MAX_LENGTH,
        meta: { description: 'The tenant of the service principal, required for it.' },
      })
    ),
    scopes: schema.maybe(
      schema.arrayOf(schema.string({ minLength: 1, maxLength: OTLP_AZURE_SCOPE_MAX_LENGTH }), {
        minSize: 1,
        maxSize: OTLP_AZURE_SCOPES_MAX_SIZE,
        meta: {
          description:
            'The scope of the token, a single one. By default `https://<host of the endpoint>/.default`, set it when the endpoint expects another audience, e.g. `https://monitor.azure.com/.default`.',
        },
      })
    ),
  },
  { meta: { id: 'otlp_azure_auth' } }
);

/**
 * How the OTLP output authenticates with an endpoint that is not the managed OTLP endpoint. The
 * credential of the header types is in `secrets.auth.credential`, it is placed verbatim in the
 * header.
 */
const OtlpAuthSchema = schema.discriminatedUnion('type', [
  OtlpAuthHeaderSchema,
  OtlpCustomAuthHeaderSchema,
  OtlpAzureAuthSchema,
]);

// the response schema allows unknown keys: it has its own ids, as the exporter ones
const OtlpAuthResponseSchema = schema.discriminatedUnion('type', [
  OtlpAuthHeaderSchema.extends({}, { meta: { id: 'otlp_response_auth_header' } }),
  OtlpCustomAuthHeaderSchema.extends({}, { meta: { id: 'otlp_response_custom_auth_header' } }),
  OtlpAzureAuthSchema.extends({}, { meta: { id: 'otlp_response_azure_auth' } }),
]);

// the credential is sent in a single header: it is bounded to what servers accept for a header
// a reference is the id of the secret document, bounded as Elasticsearch bounds document ids
const SECRET_REFERENCE_MAX_LENGTH = 512;

const OtlpAuthCredentialSchema = schema.oneOf([
  schema.object({
    id: schema.string({ minLength: 1, maxLength: SECRET_REFERENCE_MAX_LENGTH }),
    hash: schema.maybe(schema.string({ maxLength: SECRET_REFERENCE_MAX_LENGTH })),
  }),
  schema.string({ minLength: 1, maxLength: OTLP_AUTH_CREDENTIAL_MAX_LENGTH }),
]);

const OtlpSecretsSchema = schema.maybe(
  schema.object({
    auth: schema.maybe(
      schema.object({
        credential: schema.maybe(OtlpAuthCredentialSchema),
        azure_client_secret: schema.maybe(OtlpAuthCredentialSchema),
      })
    ),
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

const OtlpUpdateSecretsSchema = schema.maybe(
  schema.object({
    auth: schema.maybe(
      schema.object({
        credential: schema.maybe(schema.oneOf([schema.literal(null), OtlpAuthCredentialSchema])),
        azure_client_secret: schema.maybe(
          schema.oneOf([schema.literal(null), OtlpAuthCredentialSchema])
        ),
      })
    ),
    otlp_exporter: schema.maybe(
      schema.object({
        tls: schema.maybe(
          schema.object({
            key_pem: schema.maybe(nullableSecretRefSchema),
            tpm: schema.maybe(
              schema.object({
                owner_auth: schema.maybe(nullableSecretRefSchema),
                auth: schema.maybe(nullableSecretRefSchema),
              })
            ),
          })
        ),
      })
    ),
  })
);

const OTLP_AUTH_DESCRIPTION =
  'How the output authenticates with the OTLP endpoint. `auth_header` and `custom_header` send the credential set in `secrets.auth.credential` in a request header. `azure` sends a Microsoft Entra ID token that the collector requests itself: it requires the `http/protobuf` protocol, an `https://` URL for `endpoint`, and for the signal endpoints that are set, and cannot be used with `otlp_exporter.tls.insecure_skip_verify`. Not accepted for the managed OTLP endpoint.';

export const OtlpSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Otlp),
  otlp_exporter: OtlpExporterSchema,
  auth: schema.maybe(
    schema.oneOf([schema.literal(null), OtlpAuthSchema], {
      meta: { description: OTLP_AUTH_DESCRIPTION },
    })
  ),
  secrets: OtlpSecretsSchema,
};

const OtlpResponseSchema = {
  ...OtlpSchema,
  otlp_exporter: schema.maybe(OtlpExporterResponseSchema),
  auth: schema.maybe(
    schema.oneOf([schema.literal(null), OtlpAuthResponseSchema], {
      meta: { description: OTLP_AUTH_DESCRIPTION },
    })
  ),
};

export const OtlpUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Otlp)),
  otlp_exporter: schema.maybe(OtlpExporterSchema),
  auth: schema.maybe(
    schema.oneOf([schema.literal(null), OtlpAuthSchema], {
      meta: { description: OTLP_AUTH_DESCRIPTION },
    })
  ),
  secrets: OtlpUpdateSecretsSchema,
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
