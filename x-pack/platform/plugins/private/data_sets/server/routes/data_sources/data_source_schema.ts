/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const optionalString = schema.maybe(schema.string());
const optionalBoolean = schema.maybe(schema.boolean());

const s3SettingsWithSecretsSchema = schema.object({
  region: optionalString,
  endpoint: optionalString,
  auth: optionalString,
  access_key: optionalString,
  secret_key: optionalString,
  role_arn: optionalString,
  jwt_audience: optionalString,
  role_session_name: optionalString,
  sts_endpoint: optionalString,
  sts_region: optionalString,
});

const gcsSettingsWithSecretsSchema = schema.object({
  project_id: optionalString,
  endpoint: optionalString,
  token_uri: optionalString,
  auth: optionalString,
  credentials: optionalString,
  jwt_audience: optionalString,
  sts_audience: optionalString,
  service_account_impersonation_url: optionalString,
});

const azureSettingsWithSecretsSchema = schema.object({
  endpoint: optionalString,
  account: optionalString,
  auth: optionalString,
  connection_string: optionalString,
  key: optionalString,
  sas_token: optionalString,
});

const icebergSettingsWithSecretsSchema = schema.object({
  region: optionalString,
  endpoint: optionalString,
  access_key: optionalString,
  secret_key: optionalString,
});

const dataSourceTypeSchema = schema.oneOf([
  schema.literal('s3'),
  schema.literal('gcs'),
  schema.literal('azure'),
  schema.literal('iceberg'),
  schema.literal('jdbc'),
  schema.literal('flight'),
]);

/**
 * Matches {@link JdbcDataSourceSettingsWithSecrets} (extends {@link DataSourceCommon}).
 */
const jdbcSettingsWithSecretsSchema = schema.object({
  type: dataSourceTypeSchema,
  description: schema.string(),
  id: schema.string(),
  host: schema.string(),
  port: schema.string(),
  database: schema.string(),
  ssl: optionalBoolean,
  username: optionalString,
  password: optionalString,
});

const flightSettingsSchema = schema.object({
  host: schema.string(),
  port: schema.maybe(schema.number({ min: 1, max: 65535 })),
});

/**
 * Request body for `PUT .../data_sources/{id}`: {@link DataSourceWithSecrets} without
 * top-level `id` (the path supplies the id).
 */
export const putDataSourceBodySchema = schema.oneOf([
  schema.object({
    type: schema.literal('s3'),
    description: schema.string(),
    settings: s3SettingsWithSecretsSchema,
  }),
  schema.object({
    type: schema.literal('gcs'),
    description: schema.string(),
    settings: gcsSettingsWithSecretsSchema,
  }),
  schema.object({
    type: schema.literal('azure'),
    description: schema.string(),
    settings: azureSettingsWithSecretsSchema,
  }),
  schema.object({
    type: schema.literal('iceberg'),
    description: schema.string(),
    settings: icebergSettingsWithSecretsSchema,
  }),
  schema.object({
    type: schema.literal('jdbc'),
    description: schema.string(),
    settings: jdbcSettingsWithSecretsSchema,
  }),
  schema.object({
    type: schema.literal('flight'),
    description: schema.string(),
    settings: flightSettingsSchema,
  }),
]);
