/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '../../../common/constants';

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
    accountType: schema.maybe(schema.string()),
    vars: CloudConnectorResponseVarsSchema,
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
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
