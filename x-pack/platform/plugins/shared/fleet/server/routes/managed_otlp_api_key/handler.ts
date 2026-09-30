/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { PrivilegeType, ClusterPrivilegeType } from '@kbn/apm-types';

import { createManagedOtlpApiKey } from '../../services/api_keys';
import type { FleetRequestHandler, PostManagedOtlpAPIKeyRequestSchema } from '../../types';

export const createManagedOtlpApiKeyHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostManagedOtlpAPIKeyRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  // Must use asCurrentUser, not asInternalUser. ES silently clamps an API key's
  // role_descriptors to the intersection of the requesting user's privileges. The
  // kibana_system built-in role has no apm/event:write application privilege, so
  // asInternalUser produces a key with an empty role descriptor that the managed
  // OTLP service rejects with PermissionDenied.
  const esClient = coreContext.elasticsearch.client.asCurrentUser;

  // Pre-check: verify the caller holds the privileges the key will carry. Without
  // this, ES would still clamp silently and hand back a useless key.
  const privilegeCheck = await esClient.security.hasPrivileges({
    cluster: [ClusterPrivilegeType.MANAGE_OWN_API_KEY],
    application: [{ application: 'apm', privileges: [PrivilegeType.EVENT], resources: ['*'] }],
  });

  if (!privilegeCheck.has_all_requested) {
    return response.forbidden({
      body: {
        message:
          "You don't have the privileges required to create a managed OTLP API key. " +
          'You need the manage_own_api_key cluster privilege and the apm event:write application privilege.',
      },
    });
  }

  const key = await createManagedOtlpApiKey(esClient, request.body.name);

  return response.ok({
    body: {
      item: key,
    },
  });
};
