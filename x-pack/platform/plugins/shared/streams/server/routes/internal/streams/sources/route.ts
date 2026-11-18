/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { notFound } from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { streamsUnitIdentifierSchema } from '@kbn/streams-schema';
import {
  STREAMS_DEFAULT_UNIT_ID,
  STREAMS_V2_API_PRIVILEGES,
} from '../../../../../common/constants';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import type { UnitApiKey } from '../../../../lib/unit_config/unit_api_keys';
import { createServerRoute } from '../../../create_server_route';
import { assertStreamsCanvasEnabled } from '../../../streams/unit/assert_streams_canvas_enabled';
import { createUnitApiKeyService, recordComponentApiKey } from '../create_unit_api_key_service';
import {
  createSourceApiKeyPrivilegeCheck,
  createSourceApiKeyRoleDescriptors,
  createSourceResource,
  DIRECT_SOURCE_TYPE_SLUGS,
  interpretSourceApiKeyPrivileges,
  isSourceApiKey,
  MANAGED_SOURCE_TYPE_SLUGS,
  SOURCE_API_KEY_CLUSTER_PRIVILEGE,
  sourceApiKeyName,
  STREAMS_SOURCES_MANAGED_BY,
  type SourceApiKeyPrivilegeResult,
  type SourceTypeSlug,
} from './helpers';

export const sourceTypeSlugSchema = z.enum([
  ...MANAGED_SOURCE_TYPE_SLUGS,
  ...DIRECT_SOURCE_TYPE_SLUGS,
]);

export const sourceIdSchema = z
  .string()
  .max(256)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);

const apiKeyIdSchema = z.string().min(1).max(256);

/**
 * Lists all API keys for a particular source.
 */
const listSourceApiKeysRoute = createServerRoute({
  endpoint: 'GET /internal/streams/sources/api_keys',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_V2_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    query: z.object({
      sourceId: sourceIdSchema,
      unitId: streamsUnitIdentifierSchema.optional(),
    }),
  }),
  handler: async ({ getScopedClients, request, params, logger }) => {
    const clients = await getScopedClients({ request });
    const {
      query: { sourceId, unitId = STREAMS_DEFAULT_UNIT_ID },
    } = params;

    await assertStreamsCanvasEnabled(clients.uiSettingsClient);

    // Listed from the unit's key registry, so every user with V2 manage sees every user's keys.
    const apiKeys = await createUnitApiKeyService({ clients, logger }).listApiKeys(unitId);

    return {
      apiKeys: apiKeys.filter(isSourceApiKey(sourceId)).map((apiKey) => ({
        id: apiKey.key_id,
        name: sourceApiKeyName(sourceId),
        createdAt: apiKey.created_at,
      })),
    };
  },
});

/**
 * Reports whether the current user can mint a working source-scoped API key.
 * A key is clipped to the creator's privileges, so minting without this check
 * can return HTTP 200 and a dead credential.
 */
const getSourceApiKeyPrivilegesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/sources/api_key/privileges',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_V2_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    query: z.object({
      sourceId: sourceIdSchema,
      sourceTypeSlug: sourceTypeSlugSchema,
    }),
  }),
  handler: async ({ getScopedClients, request, params }) => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
    const {
      query: { sourceId, sourceTypeSlug },
    } = params;

    return getSourceApiKeyPrivileges({
      scopedClusterClient,
      isSecurityEnabled,
      sourceId,
      sourceTypeSlug,
    });
  },
});

/**
 * Creates an API key for a source. The API key is scoped to the source and can be used to send data to the source.
 */
const createSourceApiKeyRoute = createServerRoute({
  endpoint: 'POST /internal/streams/sources/api_key',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_V2_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      sourceTypeSlug: sourceTypeSlugSchema,
      sourceId: sourceIdSchema,
      unitId: streamsUnitIdentifierSchema.optional(),
    }),
  }),
  handler: async ({ getScopedClients, request, params, logger }) => {
    const clients = await getScopedClients({ request });
    const { scopedClusterClient, isSecurityEnabled } = clients;
    const {
      body: { sourceId, sourceTypeSlug, unitId = STREAMS_DEFAULT_UNIT_ID },
    } = params;

    await assertStreamsCanvasEnabled(clients.uiSettingsClient);

    const sourceResource = createSourceResource(sourceId);
    const privileges = await getSourceApiKeyPrivileges({
      scopedClusterClient,
      isSecurityEnabled,
      sourceId,
      sourceTypeSlug,
    });

    if (!privileges.canCreate) {
      throw new StatusError(
        getSourceApiKeyPrivilegeErrorMessage(privileges.failure, sourceId),
        403
      );
    }

    const name = sourceApiKeyName(sourceId);
    const createdAt = new Date().toISOString();
    const roleDescriptors = createSourceApiKeyRoleDescriptors({
      sourceTypeSlug,
      sourceResource,
    });
    const { id, encoded } = await scopedClusterClient.asCurrentUser.security.createApiKey({
      name,
      role_descriptors: roleDescriptors,
      metadata: {
        managed_by: STREAMS_SOURCES_MANAGED_BY,
        source_id: sourceId,
        source_type: sourceTypeSlug,
        source_resource: sourceResource,
        streams_unit_id: unitId,
      },
    });

    await recordComponentApiKey({
      unitApiKeyService: createUnitApiKeyService({ clients, logger }),
      unitId,
      apiKey: {
        key_id: id,
        component_type: 'source',
        component_id: sourceId,
        created_at: createdAt,
      },
      invalidate: clients.invalidateApiKeysAsInternalUser,
      logger,
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
 * Invalidates an API key belonging to a particular source.
 */
const deleteSourceApiKeyRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/sources/api_key',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_V2_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      sourceId: sourceIdSchema,
      apiKeyId: apiKeyIdSchema,
      unitId: streamsUnitIdentifierSchema.optional(),
    }),
  }),
  handler: async ({ getScopedClients, request, params, logger }) => {
    const clients = await getScopedClients({ request });
    const {
      body: { apiKeyId, sourceId, unitId = STREAMS_DEFAULT_UNIT_ID },
    } = params;

    await assertStreamsCanvasEnabled(clients.uiSettingsClient);

    const unitApiKeyService = createUnitApiKeyService({ clients, logger });
    const isRequestedKey = (apiKey: UnitApiKey) =>
      apiKey.key_id === apiKeyId && isSourceApiKey(sourceId)(apiKey);

    if (!(await unitApiKeyService.listApiKeys(unitId)).some(isRequestedKey)) {
      throw notFound(`API key ${apiKeyId} was not found for source ${sourceId}`);
    }

    const { revoked } = await unitApiKeyService.revokeApiKeys(unitId, isRequestedKey);
    if (revoked.length === 0) {
      throw new StatusError(`Failed to revoke API key ${apiKeyId} for source ${sourceId}`, 500);
    }

    return { invalidatedApiKeys: revoked.map(({ key_id: keyId }) => keyId) };
  },
});

export const internalSourceRoutes = {
  ...listSourceApiKeysRoute,
  ...getSourceApiKeyPrivilegesRoute,
  ...createSourceApiKeyRoute,
  ...deleteSourceApiKeyRoute,
};

const getSourceApiKeyPrivileges = async ({
  scopedClusterClient,
  isSecurityEnabled,
  sourceId,
  sourceTypeSlug,
}: {
  scopedClusterClient: IScopedClusterClient;
  isSecurityEnabled: boolean;
  sourceId: string;
  sourceTypeSlug: SourceTypeSlug;
}): Promise<SourceApiKeyPrivilegeResult> => {
  if (!isSecurityEnabled) {
    return { canCreate: true, failure: 'none' };
  }

  const sourceResource = createSourceResource(sourceId);
  const privilegeCheck = createSourceApiKeyPrivilegeCheck({ sourceTypeSlug, sourceResource });
  const response = await scopedClusterClient.asCurrentUser.security.hasPrivileges(privilegeCheck);

  return interpretSourceApiKeyPrivileges({
    sourceTypeSlug,
    hasAllRequested: response.has_all_requested,
    canManageApiKeys: response.cluster[SOURCE_API_KEY_CLUSTER_PRIVILEGE] === true,
  });
};

const getSourceApiKeyPrivilegeErrorMessage = (
  failure: SourceApiKeyPrivilegeResult['failure'],
  sourceId: string
): string => {
  if (failure === 'cluster') {
    return i18n.translate('xpack.streams.sources.missingApiKeyClusterPrivilegeErrorMessage', {
      defaultMessage:
        "Your account can't create API keys. It needs the manage_own_api_key privilege.",
    });
  }

  if (failure === 'index') {
    return i18n.translate('xpack.streams.sources.missingSourceIndexPrivilegeErrorMessage', {
      defaultMessage:
        "Your account can't create keys for this source. It needs the write and auto_configure index privileges on all indices.",
    });
  }

  return i18n.translate('xpack.streams.sources.missingSourceWritePrivilegeErrorMessage', {
    defaultMessage:
      "Your account can't create keys for this source. It needs the write privilege of the streams application on source:{sourceId}, or on source:* for every source.",
    values: { sourceId },
  });
};
