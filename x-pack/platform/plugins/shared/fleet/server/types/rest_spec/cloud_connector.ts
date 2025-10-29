/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { AgentPolicyBaseSchema } from '../models';

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

// Schema for CloudConnectorSecretVar in REQUEST (password type with raw string value)
// Used for createAgentPolicyWithCloudConnector where secrets are extracted by backend
const CloudConnectorSecretVarRequestSchema = schema.object({
  type: schema.maybe(schema.literal('password')),
  value: schema.string(), // Raw secret value, not a reference
  frozen: schema.maybe(schema.boolean()),
});

// Schema for AWS Cloud Connector Vars

const AwsCloudConnectorVarsSchema = schema.object({
  role_arn: CloudConnectorVarSchema,
  external_id: CloudConnectorSecretVarSchema,
});

// Schema for AWS Cloud Connector Vars in REQUEST (with raw secret values)
const AwsCloudConnectorVarsRequestSchema = schema.object({
  role_arn: CloudConnectorVarSchema,
  external_id: CloudConnectorSecretVarRequestSchema,
});

// Schema for Azure Cloud Connector Vars
const AzureCloudConnectorVarsSchema = schema.object({
  tenant_id: CloudConnectorSecretVarSchema,
  client_id: CloudConnectorSecretVarSchema,
  azure_credentials_cloud_connector_id: CloudConnectorVarSchema,
});

// Schema for Azure Cloud Connector Vars in REQUEST (with raw secret values)
const AzureCloudConnectorVarsRequestSchema = schema.object({
  tenant_id: CloudConnectorSecretVarRequestSchema,
  client_id: CloudConnectorSecretVarRequestSchema,
  azure_credentials_cloud_connector_id: CloudConnectorVarSchema,
});

// Conditional CloudConnectorVars schema based on cloudProvider
const CloudConnectorVarsSchema = schema.conditional(
  schema.siblingRef('cloudProvider'),
  'azure',
  AzureCloudConnectorVarsSchema,
  AwsCloudConnectorVarsSchema
);

// Conditional CloudConnectorVars REQUEST schema based on cloudProvider (accepts raw secret values)
const CloudConnectorVarsRequestSchema = schema.conditional(
  schema.siblingRef('cloudProvider'),
  'azure',
  AzureCloudConnectorVarsRequestSchema,
  AwsCloudConnectorVarsRequestSchema
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

// Schema for response vars - using recordOf for flexible OpenAPI generation
// The actual structure varies based on cloudProvider (AWS vs Azure), so we use a flexible schema
const CloudConnectorResponseVarsSchema = schema.recordOf(schema.string(), schema.any());

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

// Internal API: Create Agent Policy with Cloud Connector and Package Policy
export const CreateAgentPolicyWithCloudConnectorRequestSchema = {
  body: schema.object({
    // Spread all agent policy base fields (same pattern as NewAgentPolicySchema)
    ...AgentPolicyBaseSchema,
    // Add force field from NewAgentPolicySchema
    force: schema.maybe(schema.boolean()),
    // Add cloud connector fields (accepts raw secret values, backend extracts secrets)
    cloud_connector: schema.object({
      name: schema.string({ minLength: 1, maxLength: 255 }),
      cloudProvider: schema.oneOf([
        schema.literal('aws'),
        schema.literal('azure'),
        schema.literal('gcp'),
      ]),
      vars: CloudConnectorVarsRequestSchema, // Accepts raw string values for secrets
    }),
    // Package policy as any() since CreatePackagePolicyRequestSchema.body uses schema.oneOf()
    // which is complex to nest. Validation happens at service layer.
    package_policy: schema.any(),
  }),
  query: schema.object({
    sys_monitoring: schema.maybe(schema.boolean()),
  }),
};

export const CreateAgentPolicyWithCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    agent_policy_id: schema.string(),
    cloud_connector_id: schema.string(),
    package_policy_id: schema.string(),
  }),
});
