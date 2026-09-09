/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../common/constants';

import { RenderIacTemplateIntegrationSchema } from './iac_provisioner';

// Upper bounds prevent unbounded-input DoS: the key is a prefixed sha256 digest, the deployment id an ARN.
const IacRequestFieldsSchema = {
  iac_key: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 512,
      meta: { description: 'Opaque IaC template key returned by the IaC Provisioner.' },
    })
  ),
  iac_deployment_id: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 2048,
      meta: { description: 'Provider deployment identity (AWS: CloudFormation stack ARN).' },
    })
  ),
};

export const CreateCloudConnectorRequestSchema = {
  body: schema.object({
    name: schema.string({
      minLength: 1,
      maxLength: 255,
      meta: { description: 'The name of the cloud connector.' },
    }),
    cloudProvider: schema.oneOf(
      [schema.literal('aws'), schema.literal('azure'), schema.literal('gcp')],
      {
        meta: { description: 'The cloud provider type: aws, azure, or gcp.' },
      }
    ),
    accountType: schema.maybe(
      schema.oneOf([schema.literal(SINGLE_ACCOUNT), schema.literal(ORGANIZATION_ACCOUNT)], {
        meta: {
          description:
            'The account type: single-account (single account/subscription) or organization-account (organization-wide).',
        },
      })
    ),
    vars: schema.recordOf(
      schema.string({ minLength: 1, maxLength: 100 }),
      schema.oneOf([
        schema.string({ maxLength: 1000 }),
        schema.number(),
        schema.boolean(),
        schema.object({
          type: schema.string({ maxLength: 50 }),
          value: schema.oneOf([
            schema.string({ maxLength: 1000 }),
            schema.object({
              isSecretRef: schema.boolean(),
              id: schema.string({ maxLength: 255 }),
            }),
          ]),
          frozen: schema.maybe(schema.boolean()),
        }),
      ])
    ),
    ...IacRequestFieldsSchema,
  }),
};

// Schema for response vars - using recordOf for flexible OpenAPI generation
// The actual structure varies based on cloudProvider (AWS vs Azure), so we use a flexible schema
const CloudConnectorResponseVarsSchema = schema.recordOf(schema.string(), schema.any());

const VerificationFieldsSchema = {
  verification_status: schema.maybe(schema.string()),
  verification_started_at: schema.maybe(schema.string()),
  verification_failed_at: schema.maybe(schema.string()),
};

const IacResponseFieldsSchema = {
  iac_key: schema.maybe(schema.string()),
  iac_deployment_id: schema.maybe(schema.string()),
  iac_upgrade_status: schema.maybe(schema.string()),
  iac_upgrade_checked_at: schema.maybe(schema.string()),
};

export const CreateCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    accountType: schema.maybe(schema.string()),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
    ...VerificationFieldsSchema,
    ...IacResponseFieldsSchema,
  }),
});

export const GetCloudConnectorsRequestSchema = {
  query: schema.object({
    page: schema.maybe(
      schema.string({
        meta: { description: 'The page number for pagination.' },
      })
    ),
    perPage: schema.maybe(
      schema.string({
        meta: { description: 'The number of items per page.' },
      })
    ),
    kuery: schema.maybe(
      schema.string({
        meta: { description: 'KQL query to filter cloud connectors.' },
      })
    ),
  }),
};

export const GetCloudConnectorsResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      id: schema.string(),
      name: schema.string(),
      namespace: schema.maybe(schema.string()),
      cloudProvider: schema.string(),
      accountType: schema.maybe(schema.string()),
      vars: CloudConnectorResponseVarsSchema,
      packagePolicyCount: schema.number(),
      created_at: schema.string(),
      updated_at: schema.string(),
      ...VerificationFieldsSchema,
      ...IacResponseFieldsSchema,
    }),
    { maxSize: 10000 }
  ),
});

export const GetCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      meta: { description: 'The unique identifier of the cloud connector.' },
    }),
  }),
};

export const GetCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    accountType: schema.maybe(schema.string()),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
    ...VerificationFieldsSchema,
    ...IacResponseFieldsSchema,
  }),
});

export const DeleteCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      meta: { description: 'The unique identifier of the cloud connector to delete.' },
    }),
  }),
  query: schema.object({
    force: schema.maybe(
      schema.boolean({
        meta: { description: 'If true, forces deletion even if the cloud connector is in use.' },
      })
    ),
  }),
};

export const DeleteCloudConnectorResponseSchema = schema.object({
  id: schema.string(),
});

export const UpdateCloudConnectorRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      meta: { description: 'The unique identifier of the cloud connector to update.' },
    }),
  }),
  body: schema.object({
    name: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 255,
        meta: { description: 'The name of the cloud connector.' },
      })
    ),
    accountType: schema.maybe(
      schema.oneOf([schema.literal(SINGLE_ACCOUNT), schema.literal(ORGANIZATION_ACCOUNT)], {
        meta: {
          description:
            'The account type: single-account (single account/subscription) or organization-account (organization-wide).',
        },
      })
    ),
    vars: schema.maybe(
      schema.recordOf(
        schema.string({ minLength: 1, maxLength: 100 }),
        schema.oneOf([
          schema.string({ maxLength: 1000 }),
          schema.number(),
          schema.boolean(),
          schema.object({
            type: schema.string({ maxLength: 50 }),
            value: schema.oneOf([
              schema.string({ maxLength: 1000 }),
              schema.object({
                isSecretRef: schema.boolean(),
                id: schema.string({ maxLength: 255 }),
              }),
            ]),
            frozen: schema.maybe(schema.boolean()),
          }),
        ])
      )
    ),
    ...IacRequestFieldsSchema,
  }),
};

export const UpdateCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    accountType: schema.maybe(schema.string()),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
    ...VerificationFieldsSchema,
    ...IacResponseFieldsSchema,
  }),
});

export const GetCloudConnectorUsageRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      meta: { description: 'The unique identifier of the cloud connector.' },
    }),
  }),
  query: schema.object({
    page: schema.maybe(
      schema.number({
        min: 1,
        meta: { description: 'The page number for pagination.' },
      })
    ),
    perPage: schema.maybe(
      schema.number({
        min: 1,
        meta: { description: 'The number of items per page.' },
      })
    ),
  }),
};

export const GetCloudConnectorUsageResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      id: schema.string(),
      name: schema.string(),
      package: schema.maybe(
        schema.object({
          name: schema.string(),
          title: schema.string(),
          version: schema.string(),
        })
      ),
      policy_ids: schema.arrayOf(schema.string(), { maxSize: 10000 }),
      created_at: schema.string(),
      updated_at: schema.string(),
    }),
    { maxSize: 10000 }
  ),
  total: schema.number(),
  page: schema.number(),
  perPage: schema.number(),
});

export const VerifyCloudConnectorIacKeyRequestSchema = {
  params: schema.object({
    cloudConnectorId: schema.string({
      maxLength: 255,
      meta: { description: 'The unique identifier of the cloud connector.' },
    }),
  }),
  body: schema.object({
    // The integration being added carries the same shape the render route takes:
    // the policy templates the user enabled, with only the inputs they enabled.
    integration: schema.maybe(RenderIacTemplateIntegrationSchema),
  }),
};

export const VerifyCloudConnectorIacKeyResponseSchema = schema.object({
  matches: schema.boolean(),
  reason: schema.maybe(schema.oneOf([schema.literal('no_key'), schema.literal('key_mismatch')])),
  deploymentId: schema.maybe(schema.string()),
  region: schema.maybe(schema.string()),
  // Same shape the render route takes, so the browser can re-render exactly this set.
  integrations: schema.arrayOf(RenderIacTemplateIntegrationSchema),
});
