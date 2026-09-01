/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import {
  FLEET_SCHEMA_ID_MAX_LENGTH,
  FLEET_SCHEMA_NAME_MAX_LENGTH,
  FLEET_SCHEMA_LONG_TEXT_MAX_LENGTH,
} from '../../constants';

import { ListResponseSchema } from '../../routes/schema/utils';

export const GetUninstallTokensMetadataRequestSchema = {
  query: schema.object({
    policyId: schema.maybe(
      schema.string({
        maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
        meta: { description: 'Partial match filtering for policy IDs' },
      })
    ),
    search: schema.maybe(
      schema.string({
        maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
        meta: { description: 'Partial match filtering for uninstall token values' },
      })
    ),
    perPage: schema.maybe(
      schema.number({
        defaultValue: 20,
        min: 5,
        meta: { description: 'The number of items to return' },
      })
    ),
    page: schema.maybe(
      schema.number({ defaultValue: 1, min: 1, meta: { description: 'Page number' } })
    ),
  }),
};

const UninstallTokenMetadataSchema = schema.object({
  id: schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH }),
  policy_id: schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH }),
  policy_name: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string({ maxLength: FLEET_SCHEMA_NAME_MAX_LENGTH })])
  ),
  created_at: schema.string({ maxLength: FLEET_SCHEMA_ID_MAX_LENGTH }),
  namespaces: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
});

export const GetUninstallTokensMetadataResponseSchema = ListResponseSchema(
  UninstallTokenMetadataSchema
);

export const GetUninstallTokenRequestSchema = {
  params: schema.object({
    uninstallTokenId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the uninstall token' },
    }),
  }),
};

export const GetUninstallTokenResponseSchema = schema.object({
  item: UninstallTokenMetadataSchema.extends({
    token: schema.string({ maxLength: FLEET_SCHEMA_LONG_TEXT_MAX_LENGTH }),
  }),
});

export const RotateUninstallTokenRequestSchema = {
  params: schema.object({
    agentPolicyId: schema.string({
      maxLength: FLEET_SCHEMA_ID_MAX_LENGTH,
      meta: { description: 'The ID of the agent policy whose uninstall token should be rotated' },
    }),
  }),
};

export const RotateUninstallTokenResponseSchema = schema.object({
  message: schema.string({ maxLength: 500 }),
});
