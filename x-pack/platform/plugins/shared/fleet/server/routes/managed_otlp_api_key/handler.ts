/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { createManagedOtlpApiKey } from '../../services/api_keys';
import type { FleetRequestHandler, PostManagedOtlpAPIKeyRequestSchema } from '../../types';

export const createManagedOtlpApiKeyHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostManagedOtlpAPIKeyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  // Mint the key as the internal (Fleet system) user, not asCurrentUser.
  // The APM-scoped role_descriptor is fixed and not derived from the caller, so there is no
  // need to require the caller to hold the ES `manage_own_api_key` cluster privilege —
  // a privilege that `Fleet: All` does not confer. Route authz (`fleet-agents-all`) already
  // controls who can call this endpoint. Mirrors how enrollment-api-key routes mint keys.
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const key = await createManagedOtlpApiKey(esClient, request.body.name);

  return response.ok({
    body: {
      item: key,
    },
  });
};
