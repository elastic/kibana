/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  SimplifiedPackagePolicyInputRecordSchema,
  SimplifiedVarsSchema,
} from './package_policy_schema';

const AgentlessPolicyPackageSchema = schema.object(
  {
    name: schema.string({
      meta: { description: 'Integration package name.' },
    }),
    title: schema.string({
      meta: { description: 'Integration package display title.' },
    }),
    version: schema.string({
      meta: { description: 'Integration package version.' },
    }),
  },
  { meta: { id: 'agentless_policy_package' } }
);

const CloudConnectorSchema = schema.object(
  {
    enabled: schema.boolean({
      meta: { description: 'Whether the cloud connector is active for this policy.' },
    }),
    cloud_connector_id: schema.string({
      meta: { description: 'The ID of the cloud connector.' },
    }),
  },
  { meta: { id: 'agentless_policy_cloud_connector' } }
);

const GlobalDataTagSchema = schema.object({
  name: schema.string({
    meta: { description: 'The name of the custom field.' },
  }),
  value: schema.oneOf([schema.string(), schema.number()], {
    meta: { description: 'The value of the custom field.' },
  }),
});

export const AgentlessPolicySchema = schema.object(
  {
    id: schema.string({
      meta: { description: 'Agentless policy unique identifier.' },
    }),
    name: schema.string({
      meta: { description: 'Agentless policy name.' },
    }),
    description: schema.maybe(
      schema.string({
        meta: { description: 'Agentless policy description.' },
      })
    ),
    namespace: schema.maybe(
      schema.string({
        meta: { description: 'Policy namespace. Defaults to the agent policy namespace.' },
      })
    ),
    vars: schema.maybe(SimplifiedVarsSchema),
    global_data_tags: schema.maybe(
      schema.arrayOf(GlobalDataTagSchema, {
        maxSize: 100,
        meta: { description: 'Custom data tags applied to all data produced by this policy.' },
      })
    ),
    cloud_connector: schema.maybe(schema.nullable(CloudConnectorSchema)),
    package: AgentlessPolicyPackageSchema,
    inputs: SimplifiedPackagePolicyInputRecordSchema,
    created_at: schema.string({
      meta: { description: 'Creation timestamp (ISO 8601).' },
    }),
    created_by: schema.string({
      meta: { description: 'User who created the policy.' },
    }),
    updated_at: schema.string({
      meta: { description: 'Last update timestamp (ISO 8601).' },
    }),
    updated_by: schema.string({
      meta: { description: 'User who last updated the policy.' },
    }),
  },
  { meta: { id: 'agentless_policy' } }
);

export const AgentlessPolicyResponseSchema = schema.object(
  {
    item: AgentlessPolicySchema,
  },
  { meta: { id: 'agentless_policy_response' } }
);
