/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

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

export const CreateCloudConnectorResponseSchema = schema.object({
  item: schema.object({
    id: schema.string(),
    name: schema.string(),
    namespace: schema.maybe(schema.string()),
    cloudProvider: schema.string(),
    vars: schema.recordOf(schema.string(), schema.any()),
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
  }),
});

export const GetCloudConnectorsRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.string()),
    perPage: schema.maybe(schema.string()),
  }),
};

export const GetCloudConnectorsResponseSchema = schema.object({
  items: schema.arrayOf(
    schema.object({
      id: schema.string(),
      name: schema.string(),
      namespace: schema.maybe(schema.string()),
      cloudProvider: schema.string(),
      vars: schema.recordOf(schema.string(), schema.any()),
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
    vars: schema.recordOf(schema.string(), schema.any()),
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
    vars: schema.recordOf(schema.string(), schema.any()),
    packagePolicyCount: schema.number(),
    created_at: schema.string(),
    updated_at: schema.string(),
  }),
});
