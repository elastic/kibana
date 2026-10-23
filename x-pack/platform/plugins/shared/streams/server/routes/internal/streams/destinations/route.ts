/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { streamsUnitIdentifierSchema } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES, STREAMS_DEFAULT_UNIT_ID } from '../../../../../common/constants';
import {
  MAX_RESOLVE_INDEX_PATTERN_LENGTH,
  MAX_RESOLVE_INDEX_PATTERNS,
} from '../../../../../common';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import {
  findDestinationApiKeyIds,
  invalidateApiKeyIds,
} from '../../../../lib/unit_config/managed_api_keys';
import {
  createDestinationApiKeyPrivilegeCheck,
  createDestinationApiKeyRoleDescriptors,
  DESTINATION_API_KEY_CLUSTER_PRIVILEGE,
  interpretDestinationApiKeyPrivileges,
  STREAMS_DESTINATIONS_MANAGED_BY,
  type DestinationApiKeyPrivilegeResult,
} from './helpers';

const destinationIdSchema = z
  .string()
  .max(256)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);

const patternsSchema = z
  .array(z.string().min(1).max(MAX_RESOLVE_INDEX_PATTERN_LENGTH))
  .min(1)
  .max(MAX_RESOLVE_INDEX_PATTERNS);

/**
 * Reports whether the current user can mint a destination API key for the
 * given write patterns. The key is clipped to the creator's privileges.
 */
const getDestinationApiKeyPrivilegesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/destinations/api_key/privileges',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      patterns: patternsSchema,
    }),
  }),
  handler: async ({ getScopedClients, request, params }) => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
    return getDestinationApiKeyPrivileges({
      scopedClusterClient,
      isSecurityEnabled,
      patterns: params.body.patterns,
    });
  },
});

/**
 * Creates an API key for a local Elasticsearch destination, scoped to the
 * destination's write patterns.
 */
const createDestinationApiKeyRoute = createServerRoute({
  endpoint: 'POST /internal/streams/destinations/api_key',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      destinationId: destinationIdSchema,
      patterns: patternsSchema,
      unitId: streamsUnitIdentifierSchema.optional(),
    }),
  }),
  handler: async ({ getScopedClients, request, params }) => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
    const {
      body: { destinationId, patterns, unitId = STREAMS_DEFAULT_UNIT_ID },
    } = params;
    const privileges = await getDestinationApiKeyPrivileges({
      scopedClusterClient,
      isSecurityEnabled,
      patterns,
    });

    if (!privileges.canCreate) {
      throw new StatusError(getDestinationApiKeyPrivilegeErrorMessage(privileges), 403);
    }

    const name = `streams-destination-${destinationId}`;
    const createdAt = new Date().toISOString();
    const { id, encoded } = await scopedClusterClient.asCurrentUser.security.createApiKey({
      name,
      role_descriptors: createDestinationApiKeyRoleDescriptors(patterns),
      metadata: {
        managed_by: STREAMS_DESTINATIONS_MANAGED_BY,
        streams_destination_id: destinationId,
        streams_unit_id: unitId,
      },
    });

    return {
      id,
      name,
      createdAt,
      encodedApiKey: encoded,
    };
  },
});

/**
 * Invalidates the current user's API keys minted for a destination.
 */
const deleteDestinationApiKeysRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/destinations/api_key',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      destinationId: destinationIdSchema,
      unitId: streamsUnitIdentifierSchema.optional(),
    }),
  }),
  handler: async ({ getScopedClients, request, params }) => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
    const {
      body: { destinationId, unitId = STREAMS_DEFAULT_UNIT_ID },
    } = params;
    if (!isSecurityEnabled) {
      return { invalidatedApiKeys: [] };
    }
    const client = scopedClusterClient.asCurrentUser;
    const ids = await findDestinationApiKeyIds({
      client,
      destinationIds: [destinationId],
      unitId,
    });
    const { invalidatedApiKeys, errorCount } = await invalidateApiKeyIds({ client, ids });
    if (errorCount > 0) {
      throw new StatusError(
        i18n.translate('xpack.streams.destinations.invalidateApiKeysErrorMessage', {
          defaultMessage:
            '{errorCount, plural, one {# API key} other {# API keys}} for this destination could not be deleted.',
          values: { errorCount },
        }),
        500
      );
    }

    return { invalidatedApiKeys };
  },
});

export const internalDestinationRoutes = {
  ...getDestinationApiKeyPrivilegesRoute,
  ...createDestinationApiKeyRoute,
  ...deleteDestinationApiKeysRoute,
};

const getDestinationApiKeyPrivileges = async ({
  scopedClusterClient,
  isSecurityEnabled,
  patterns,
}: {
  scopedClusterClient: IScopedClusterClient;
  isSecurityEnabled: boolean;
  patterns: string[];
}): Promise<DestinationApiKeyPrivilegeResult> => {
  if (!isSecurityEnabled) {
    return { canCreate: false, failure: 'cluster', missingPatterns: [] };
  }
  if (patterns.length === 0) {
    return { canCreate: true, failure: 'none', missingPatterns: [] };
  }

  const response = await scopedClusterClient.asCurrentUser.security.hasPrivileges(
    createDestinationApiKeyPrivilegeCheck(patterns)
  );
  const missingPatterns = patterns.filter((pattern) => {
    const indexPrivileges = response.index[pattern];
    if (!indexPrivileges) {
      return true;
    }
    return !indexPrivileges.create_doc || !indexPrivileges.auto_configure;
  });

  return interpretDestinationApiKeyPrivileges({
    canManageApiKeys: response.cluster[DESTINATION_API_KEY_CLUSTER_PRIVILEGE] === true,
    missingPatterns,
  });
};

const getDestinationApiKeyPrivilegeErrorMessage = (
  privileges: DestinationApiKeyPrivilegeResult
): string => {
  if (privileges.failure === 'cluster') {
    return i18n.translate('xpack.streams.destinations.missingApiKeyClusterPrivilegeErrorMessage', {
      defaultMessage: "Your account can't create API keys.",
    });
  }

  if (privileges.missingPatterns.length > 0) {
    return i18n.translate('xpack.streams.destinations.missingIndexPrivilegeErrorMessage', {
      defaultMessage: "Your account can't write to {patterns}.",
      values: { patterns: privileges.missingPatterns.join(', ') },
    });
  }

  return i18n.translate('xpack.streams.destinations.missingIndexPrivilegeFallbackErrorMessage', {
    defaultMessage: "Your account can't write to this destination's indices.",
  });
};
