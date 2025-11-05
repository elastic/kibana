/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf, schema } from '@kbn/config-schema';

import {
  PackagePolicyResponseSchema,
  SimplifiedCreatePackagePolicyRequestBodySchema,
} from '../models/package_policy_schema';

export const CreateAgentlessPolicyRequestSchema = {
  query: schema.object({
    format: schema.oneOf([schema.literal('legacy'), schema.literal('simplified')], {
      defaultValue: 'simplified',
      meta: {
        description: 'The format of the response package policy.',
      },
    }),
  }),
  body: SimplifiedCreatePackagePolicyRequestBodySchema.extends({
    cloud_connector_id: schema.maybe(
      schema.nullable(
        schema.string({
          meta: {
            description: 'ID of the cloud connector associated with this package policy.',
          },
        })
      )
    ),
    supports_cloud_connector: schema.maybe(
      schema.nullable(
        schema.boolean({
          defaultValue: false,
          meta: {
            description: 'Indicates whether the package policy supports cloud connectors.',
          },
        })
      )
    ),
    // Remove all properties that are not relevant for agentless policies
    policy_id: undefined,
    policy_ids: undefined,
    supports_agentless: undefined,
    output_id: undefined,
  }),
};

export const CreateAgentlessPolicyResponseSchema = schema.object({
  item: PackagePolicyResponseSchema.extends({}),
});

export type CreateAgentlessPolicyResponse = TypeOf<typeof CreateAgentlessPolicyResponseSchema>;

export interface CreateAgentlessPolicyRequest {
  body: TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>;
  query: TypeOf<typeof CreateAgentlessPolicyRequestSchema.query>;
}
