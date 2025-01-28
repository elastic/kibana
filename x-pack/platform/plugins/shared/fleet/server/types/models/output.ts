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
  }),
  schema.string(),
]);

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
  ssl: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.object({
        certificate_authorities: schema.maybe(schema.arrayOf(schema.string())),
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
      }),
    ])
  ),
  proxy_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  shipper: schema.maybe(
    schema.oneOf([
      schema.literal(null),
      schema.object({
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
      }),
    ])
  ),
  allow_edit: schema.maybe(schema.arrayOf(schema.string())),
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
  hosts: schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), { minSize: 1 }),
  preset: schema.maybe(PresetSchema),
};

const ElasticSearchUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Elasticsearch)),
  hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), { minSize: 1 })),
  preset: schema.maybe(PresetSchema),
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
      kibana_api_key: schema.maybe(secretRefSchema),
    })
  ),
  sync_integrations: schema.maybe(schema.boolean()),
  kibana_url: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  kibana_api_key: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
};

const RemoteElasticSearchUpdateSchema = {
  ...ElasticSearchUpdateSchema,
  type: schema.maybe(schema.literal(outputType.RemoteElasticsearch)),
  service_token: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  secrets: schema.maybe(
    schema.object({
      service_token: schema.maybe(secretRefSchema),
      kibana_api_key: schema.maybe(secretRefSchema),
    })
  ),
  sync_integrations: schema.maybe(schema.boolean()),
  kibana_url: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
  kibana_api_key: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
};

/**
 * Logstash schemas
 */

export const LogstashSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Logstash),
  hosts: schema.arrayOf(schema.string({ validate: validateLogstashHost }), { minSize: 1 }),
  secrets: schema.maybe(
    schema.object({
      ssl: schema.maybe(schema.object({ key: schema.maybe(secretRefSchema) })),
    })
  ),
};

const LogstashUpdateSchema = {
  ...UpdateSchema,
  type: schema.maybe(schema.literal(outputType.Logstash)),
  hosts: schema.maybe(
    schema.arrayOf(schema.string({ validate: validateLogstashHost }), { minSize: 1 })
  ),
  secrets: schema.maybe(
    schema.object({
      ssl: schema.maybe(schema.object({ key: schema.maybe(secretRefSchema) })),
    })
  ),
};

export const KafkaSchema = {
  ...BaseSchema,
  type: schema.literal(outputType.Kafka),
  hosts: schema.arrayOf(schema.string({ validate: validateKafkaHost }), { minSize: 1 }),
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
  compression_level: schema.conditional(
    schema.siblingRef('compression'),
    schema.string({ validate: (val) => (val === kafkaCompressionType.Gzip ? undefined : 'never') }),
    schema.number(),
    schema.never()
  ),
  client_id: schema.maybe(schema.string()),
  auth_type: schema.oneOf([
    schema.literal(kafkaAuthType.None),
    schema.literal(kafkaAuthType.Userpass),
    schema.literal(kafkaAuthType.Ssl),
    schema.literal(kafkaAuthType.Kerberos),
  ]),
  connection_type: schema.conditional(
    schema.siblingRef('auth_type'),
    kafkaAuthType.None,
    schema.oneOf([
      schema.literal(kafkaConnectionType.Plaintext),
      schema.literal(kafkaConnectionType.Encryption),
    ]),
    schema.never()
  ),
  username: schema.nullable(
    schema.conditional(
      schema.siblingRef('auth_type'),
      kafkaAuthType.Userpass,
      schema.string(),
      schema.never()
    )
  ),
  password: schema.nullable(
    schema.conditional(
      schema.siblingRef('secrets.password'),
      secretRefSchema,
      schema.never(),
      schema.conditional(
        schema.siblingRef('username'),
        schema.string(),
        schema.string(),
        schema.never()
      )
    )
  ),
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
    schema.arrayOf(schema.object({ key: schema.string(), value: schema.string() }))
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
    schema.arrayOf(schema.string({ validate: validateKafkaHost }), { minSize: 1 })
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

export const OutputSchema = schema.oneOf([
  schema.object({ ...ElasticSearchSchema }),
  schema.object({ ...RemoteElasticSearchSchema }),
  schema.object({ ...LogstashSchema }),
  schema.object({ ...KafkaSchema }),
]);

export const OutputResponseSchema = schema.object({
  item: OutputSchema.extendsDeep({
    unknowns: 'allow',
  }),
});

export const UpdateOutputSchema = schema.oneOf([
  schema.object({ ...ElasticSearchUpdateSchema }),
  schema.object({ ...RemoteElasticSearchUpdateSchema }),
  schema.object({ ...LogstashUpdateSchema }),
  schema.object({ ...KafkaUpdateSchema }),
]);
