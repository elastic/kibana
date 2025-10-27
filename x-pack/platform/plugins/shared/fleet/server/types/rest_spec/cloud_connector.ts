/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// Schema for CloudConnectorSecretReference
const CloudConnectorSecretReferenceSchema = schema.object({
  isSecretRef: schema.boolean(),
  id: schema.string(),
});

// Schema for CloudConnectorVar (text type)
const CloudConnectorVarSchema = schema.object({
  type: schema.maybe(schema.literal('text')),
  value: schema.string(),
});

// Schema for CloudConnectorSecretVar (password type with secret reference)
const CloudConnectorSecretVarSchema = schema.object({
  type: schema.maybe(schema.literal('password')),
  value: CloudConnectorSecretReferenceSchema,
  frozen: schema.maybe(schema.boolean()),
});

// Schema for Azure credentials that can be either a secret reference or a cloud connector ID string
// TODO: we may not need schema.string() refactor this when the connector name is implemented https://github.com/elastic/security-team/issues/14283
const AzureCredentialsVarSchema = schema.object({
  type: schema.maybe(schema.literal('password')),
  value: schema.oneOf([CloudConnectorSecretReferenceSchema, schema.string()]),
  frozen: schema.maybe(schema.boolean()),
});

// Schema for AWS Cloud Connector Vars

const AwsCloudConnectorVarsSchema = schema.object({
  role_arn: CloudConnectorVarSchema,
  external_id: CloudConnectorSecretVarSchema,
});

// Schema for Azure Cloud Connector Vars
const AzureCloudConnectorVarsSchema = schema.object({
  tenant_id: CloudConnectorSecretVarSchema,
  client_id: CloudConnectorSecretVarSchema,
  azure_credentials_cloud_connector_id: AzureCredentialsVarSchema,
});

// Conditional CloudConnectorVars schema based on cloudProvider
const CloudConnectorVarsSchema = schema.conditional(
  schema.siblingRef('cloudProvider'),
  'azure',
  AzureCloudConnectorVarsSchema,
  AwsCloudConnectorVarsSchema
);

export const CreateCloudConnectorRequestSchema = {
  body: schema.object({
    name: schema.string({
      minLength: 1,
      maxLength: 255,
    }),
    cloudProvider: schema.oneOf([
      schema.literal('aws'),
      schema.literal('azure'),
      schema.literal('gcp'),
    ]),
    vars: CloudConnectorVarsSchema,
  }),
};

// Schema for response vars (union type since we're returning, not validating input)
const CloudConnectorResponseVarsSchema = schema.oneOf([
  AwsCloudConnectorVarsSchema,
  AzureCloudConnectorVarsSchema,
]);

export const CreateCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
  }),
});

export const GetCloudConnectorsRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.string()),
    perPage: schema.maybe(schema.string()),
    cloudProvider: schema.maybe(schema.oneOf([schema.literal('aws'), schema.literal('azure')])),
  }),
};

export const GetCloudConnectorsResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      id: schema.string(),
      name: schema.string(),
      namespace: schema.maybe(schema.string()),
      cloudProvider: schema.string(),
      vars: CloudConnectorResponseVarsSchema,
      packagePolicyCount: schema.number(),
      created_at: schema.string(),
      updated_at: schema.string(),
    })
  ),
});

export const GetCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string(),
  }),
};

export const GetCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
  }),
});

export const DeleteCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string(),
  }),
  query: schema.object({
    force: schema.maybe(schema.boolean()),
  }),
};

export const DeleteCloudConnectorResponseSchema = schema.object({
  id: schema.string(),
});

export const UpdateCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string(),
  }),
  body: schema.object({
    name: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 255,
      })
    ),
    // For updates, we accept either AWS or Azure vars structure
    vars: schema.maybe(CloudConnectorResponseVarsSchema),
  }),
};

export const UpdateCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
  }),
});
