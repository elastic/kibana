/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const optionalString = schema.maybe(schema.string({ maxLength: 4096 }));

// Secret fields (per SECRET_FIELDS_BY_TYPE in ../../../common) get PUT merge semantics in
// Elasticsearch: omitting the key keeps the stored value, but an explicit `null` must be
// accepted so the client can clear one.
const nullableSecretString = schema.maybe(schema.nullable(schema.string({ maxLength: 4096 })));

const s3PlaintextSettingsProps = {
  region: optionalString,
  endpoint: optionalString,
  auth: optionalString,
  role_arn: optionalString,
  jwt_audience: optionalString,
  role_session_name: optionalString,
  sts_endpoint: optionalString,
  sts_region: optionalString,
};

const gcsPlaintextSettingsProps = {
  project_id: optionalString,
  endpoint: optionalString,
  token_uri: optionalString,
  auth: optionalString,
  jwt_audience: optionalString,
  sts_audience: optionalString,
  service_account_impersonation_url: optionalString,
};

const azurePlaintextSettingsProps = {
  endpoint: optionalString,
  account: optionalString,
  auth: optionalString,
  tenant_id: optionalString,
  client_id: optionalString,
  jwt_audience: optionalString,
};

const s3SettingsWithSecretsSchema = schema.object({
  ...s3PlaintextSettingsProps,
  access_key: nullableSecretString,
  secret_key: nullableSecretString,
});

const gcsSettingsWithSecretsSchema = schema.object({
  ...gcsPlaintextSettingsProps,
  credentials: nullableSecretString,
});

const azureSettingsWithSecretsSchema = schema.object({
  ...azurePlaintextSettingsProps,
  connection_string: nullableSecretString,
  key: nullableSecretString,
  sas_token: nullableSecretString,
});

// The test API has no stored data source to merge into, so a `null` secret has no meaning
// there: Elasticsearch passes the settings straight to the PUT validator, which rejects it.
const s3TestSettingsSchema = schema.object({
  ...s3PlaintextSettingsProps,
  access_key: optionalString,
  secret_key: optionalString,
});

const gcsTestSettingsSchema = schema.object({
  ...gcsPlaintextSettingsProps,
  credentials: optionalString,
});

const azureTestSettingsSchema = schema.object({
  ...azurePlaintextSettingsProps,
  connection_string: optionalString,
  key: optionalString,
  sas_token: optionalString,
});

/**
 * Request body for `PUT .../data_sources/{id}`: {@link DataSourceWithSecrets} without
 * top-level `id` (the path supplies the id).
 */
export const putDataSourceBodySchema = schema.oneOf([
  schema.object({
    type: schema.literal('s3'),
    description: schema.string({ maxLength: 1024 }),
    settings: s3SettingsWithSecretsSchema,
  }),
  schema.object({
    type: schema.literal('gcs'),
    description: schema.string({ maxLength: 1024 }),
    settings: gcsSettingsWithSecretsSchema,
  }),
  schema.object({
    type: schema.literal('azure'),
    description: schema.string({ maxLength: 1024 }),
    settings: azureSettingsWithSecretsSchema,
  }),
]);

/**
 * Request body for `POST .../data_sources/_test`: only the `type` and `settings` the
 * Elasticsearch probe reads. Its parser rejects unknown fields, so `name` and
 * `description` must stay out of this schema even though the PUT accepts them.
 */
export const testDataSourceBodySchema = schema.oneOf([
  schema.object({
    type: schema.literal('s3'),
    settings: s3TestSettingsSchema,
  }),
  schema.object({
    type: schema.literal('gcs'),
    settings: gcsTestSettingsSchema,
  }),
  schema.object({
    type: schema.literal('azure'),
    settings: azureTestSettingsSchema,
  }),
]);
