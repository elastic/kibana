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
    // Remove all properties that are not relevant for agentless policies
    policy_id: undefined,
    policy_ids: undefined,
    supports_agentless: undefined,
    output_id: undefined,
    policy_template: schema.maybe(
      schema.string({
        meta: {
          description:
            'The policy template to use for the agentless package policy. If not provided, the default policy template will be used.',
        },
      })
    ),
    // Cloud connector configuration - all connector settings go here
    cloud_connector: schema.maybe(
      schema.object({
        enabled: schema.boolean({
          defaultValue: false,
          meta: { description: 'Whether cloud connectors are enabled for this policy.' },
        }),
        cloud_connector_id: schema.maybe(
          schema.string({
            meta: {
              description:
                'ID of an existing cloud connector to reuse. If not provided, a new connector will be created.',
            },
          })
        ),
        name: schema.maybe(
          schema.string({
            minLength: 1,
            maxLength: 255,
            meta: {
              description:
                'Optional name for the cloud connector. If not provided, will be auto-generated from credentials.',
            },
          })
        ),
      })
    ),
  }),
};

export const DeleteAgentlessPolicyRequestSchema = {
  query: schema.object({
    force: schema.maybe(
      schema.boolean({
        defaultValue: false,
        meta: {
          description: 'Force delete the policy even if the policy is managed.',
        },
      })
    ),
  }),
  params: schema.object({
    policyId: schema.string({
      meta: {
        description: 'The ID of the policy to delete.',
      },
    }),
  }),
};

export const DeleteAgentlessPolicyResponseSchema = schema.object(
  {
    id: schema.string({
      meta: {
        description: 'The ID of the deleted agentless package policy.',
      },
    }),
  },
  {
    meta: {
      description: 'Response for deleting an agentless package policy.',
    },
  }
);

export const CreateAgentlessPolicyResponseSchema = schema.object({
  item: PackagePolicyResponseSchema.extends(
    {},
    {
      meta: {
        description: 'The created agentless package policy.',
      },
    }
  ),
});

export type CreateAgentlessPolicyResponse = TypeOf<typeof CreateAgentlessPolicyResponseSchema>;

export interface CreateAgentlessPolicyRequest {
  body: TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>;
  query: TypeOf<typeof CreateAgentlessPolicyRequestSchema.query>;
}

export type DeleteAgentlessPolicyResponse = TypeOf<typeof DeleteAgentlessPolicyResponseSchema>;

export interface DeleteAgentlessPolicyRequest {
  params: TypeOf<typeof DeleteAgentlessPolicyRequestSchema.params>;
  query: TypeOf<typeof DeleteAgentlessPolicyRequestSchema.query>;
}
