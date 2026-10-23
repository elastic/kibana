/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import {
  FLEET_SCHEMA_SHORT_TEXT_MAX_LENGTH,
  FLEET_SCHEMA_NAME_MAX_LENGTH,
  FLEET_SCHEMA_LONG_TEXT_MAX_LENGTH,
} from '../../constants';

import { ListResponseSchema } from '../../routes/schema/utils';

/** Partial-match filter terms on the uninstall token list endpoint. */
const UNINSTALL_TOKEN_SEARCH_TERM_MAX_LENGTH = 50;

/** Agent policy ID accepted by the token rotation endpoint. */
const UNINSTALL_TOKEN_POLICY_ID_MAX_LENGTH = 255;

export const GetUninstallTokensMetadataRequestSchema = {
  query: schema.object({
    // Both filters keep their pre-existing 50 character limit rather than taking the
    // savedObjectId default: they are partial-match terms, not whole IDs, and they are
    // expanded into an Elasticsearch `regexp` / `query_string` query whose cost grows
    // with the number of wildcards the term produces.
    policyId: schema.maybe(
      schema.savedObjectId({
        minLength: 0,
        maxLength: UNINSTALL_TOKEN_SEARCH_TERM_MAX_LENGTH,
        meta: { description: 'Partial match filtering for policy IDs' },
      })
    ),
    search: schema.maybe(
      schema.string({
        maxLength: UNINSTALL_TOKEN_SEARCH_TERM_MAX_LENGTH,
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
  id: schema.savedObjectId({ minLength: 0 }),
  policy_id: schema.savedObjectId({ minLength: 0 }),
  policy_name: schema.maybe(
    schema.oneOf([schema.literal(null), schema.string({ maxLength: FLEET_SCHEMA_NAME_MAX_LENGTH })])
  ),
  created_at: schema.string({ maxLength: FLEET_SCHEMA_SHORT_TEXT_MAX_LENGTH }),
  // Kibana Space IDs, not data stream namespaces: the service copies the agent
  // policy's `space_ids` into this field.
  namespaces: schema.maybe(schema.arrayOf(schema.spaceId({ minLength: 0 }), { maxSize: 100 })),
});

export const GetUninstallTokensMetadataResponseSchema = ListResponseSchema(
  UninstallTokenMetadataSchema
);

export const GetUninstallTokenRequestSchema = {
  params: schema.object({
    uninstallTokenId: schema.savedObjectId({
      minLength: 0,
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
    // Keeps its pre-existing 255 character limit rather than taking the savedObjectId
    // default of 512.
    agentPolicyId: schema.savedObjectId({
      minLength: 0,
      maxLength: UNINSTALL_TOKEN_POLICY_ID_MAX_LENGTH,
      meta: { description: 'The ID of the agent policy whose uninstall token should be rotated' },
    }),
  }),
};

export const RotateUninstallTokenResponseSchema = schema.object({
  message: schema.string({ maxLength: 500 }),
});
