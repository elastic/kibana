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
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { createServerRoute } from '../../../create_server_route';
import {
  createSourceApiKeyPrivilegeCheck,
  createSourceApiKeyRoleDescriptors,
  createSourceResource,
  DIRECT_SOURCE_TYPE_SLUGS,
  interpretSourceApiKeyPrivileges,
  isOwnedBySource,
  MANAGED_SOURCE_TYPE_SLUGS,
  SOURCE_API_KEY_CLUSTER_PRIVILEGE,
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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    query: z.object({
      sourceId: sourceIdSchema,
    }),
  }),
  handler: async ({ getScopedClients, request, params }) => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
    const {
      query: { sourceId },
    } = params;
    const canList = await canListSourceApiKeys({ scopedClusterClient, isSecurityEnabled });
    if (!canList) {
      return { apiKeys: [] };
    }
    const sourceResource = createSourceResource(sourceId);
    const response = await scopedClusterClient.asCurrentUser.security.queryApiKeys({
      query: {
        bool: {
          filter: [
            { term: { 'metadata.managed_by': STREAMS_SOURCES_MANAGED_BY } },
            { term: { 'metadata.source_resource': sourceResource } },
            { term: { invalidated: false } },
          ],
        },
      },
    });

    return {
      apiKeys: response.api_keys.map((apiKey) => ({
        id: apiKey.id,
        name: apiKey.name,
        createdAt: new Date(apiKey.creation).toISOString(),
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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      sourceTypeSlug: sourceTypeSlugSchema,
      sourceId: sourceIdSchema,
    }),
  }),
  handler: async ({ getScopedClients, request, params }) => {
    const { scopedClusterClient, isSecurityEnabled } = await getScopedClients({ request });
    const {
      body: { sourceId, sourceTypeSlug },
    } = params;
    const sourceResource = createSourceResource(sourceId);
    const privileges = await getSourceApiKeyPrivileges({
      scopedClusterClient,
      isSecurityEnabled,
      sourceId,
      sourceTypeSlug,
    });

    if (!privileges.canCreate) {
      throw new StatusError(getSourceApiKeyPrivilegeErrorMessage(privileges.failure), 403);
    }

    const name = `stream-source-${sourceId}`;
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
 * Invalidates an API key belonging to a particular source.
 */
const deleteSourceApiKeyRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/sources/api_key',
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
      sourceId: sourceIdSchema,
      apiKeyId: apiKeyIdSchema,
    }),
  }),
  handler: async ({ getScopedClients, request, params }) => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const {
      body: { apiKeyId, sourceId },
    } = params;
    const sourceResource = createSourceResource(sourceId);
    const { api_keys: apiKeys } = await scopedClusterClient.asCurrentUser.security.getApiKey({
      id: apiKeyId,
    });
    const apiKey = apiKeys[0];

    if (
      !apiKey ||
      !isOwnedBySource({
        metadata: apiKey.metadata,
        sourceResource,
      })
    ) {
      throw notFound(`API key ${apiKeyId} was not found for source ${sourceId}`);
    }

    const { invalidated_api_keys: invalidatedApiKeys } =
      await scopedClusterClient.asCurrentUser.security.invalidateApiKey({
        ids: [apiKeyId],
      });

    return { invalidatedApiKeys };
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
    return { canCreate: true, canList: true, failure: 'none' };
  }

  const sourceResource = createSourceResource(sourceId);
  const privilegeCheck = createSourceApiKeyPrivilegeCheck({ sourceTypeSlug, sourceResource });
  const response = await scopedClusterClient.asCurrentUser.security.hasPrivileges(privilegeCheck);

  return interpretSourceApiKeyPrivileges({
    hasAllRequested: response.has_all_requested,
    canManageApiKeys: response.cluster[SOURCE_API_KEY_CLUSTER_PRIVILEGE] === true,
  });
};

const canListSourceApiKeys = async ({
  scopedClusterClient,
  isSecurityEnabled,
}: {
  scopedClusterClient: IScopedClusterClient;
  isSecurityEnabled: boolean;
}): Promise<boolean> => {
  if (!isSecurityEnabled) {
    return true;
  }

  const response = await scopedClusterClient.asCurrentUser.security.hasPrivileges({
    cluster: [SOURCE_API_KEY_CLUSTER_PRIVILEGE],
  });

  return response.cluster[SOURCE_API_KEY_CLUSTER_PRIVILEGE] === true;
};

const getSourceApiKeyPrivilegeErrorMessage = (
  failure: SourceApiKeyPrivilegeResult['failure']
): string => {
  if (failure === 'cluster') {
    return i18n.translate('xpack.streams.sources.missingApiKeyClusterPrivilegeErrorMessage', {
      defaultMessage: "Your account can't create API keys.",
    });
  }

  return i18n.translate('xpack.streams.sources.missingIngestSourcePrivilegeErrorMessage', {
    defaultMessage:
      "Your account can't create ingest keys. An admin should assign the ingest_source_manager role.",
  });
};
