/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import type { StreamsUnit } from '@kbn/streams-schema';
import { streamsUnitIdentifierSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { StreamsUnitService } from '../../../lib/saved_objects/streams_unit_service';
import { revokeRemovedComponentApiKeys } from '../../../lib/unit_config/revoke_removed_component_api_keys';
import { createServerRoute } from '../../create_server_route';
import { indexMetadataRoute } from './index_metadata';
import { assertUnitPutEnvelope, parseUnitPutBody } from './parse_unit_put_body';
import { resolveUnitIndicesRoute } from './resolve_indices';

const UNIT_PUT_MAX_BYTES = 1_048_576;

const unitPathSchema = z.object({
  path: z.object({
    id: streamsUnitIdentifierSchema.describe('The unit id.'),
  }),
});

const assertStreamsCanvasEnabled = async (uiSettingsClient: {
  get: (key: string) => Promise<unknown>;
}) => {
  const canvasEnabled = await uiSettingsClient.get(OBSERVABILITY_STREAMS_ENABLE_CANVAS);

  if (!canvasEnabled) {
    throw notFound('Streams unit API is not enabled.');
  }
};

export const getStreamsUnitRoute = createServerRoute({
  endpoint: 'GET /internal/streams/unit/{id}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: unitPathSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<StreamsUnit.GetResponse> => {
    const { soClient, uiSettingsClient } = await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const streamsUnitService = new StreamsUnitService({
      soClient,
      logger,
    });

    return await streamsUnitService.getUnit(params.path.id);
  },
});

export const putStreamsUnitRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/unit/{id}',
  options: {
    access: 'internal',
    body: {
      accepts: [
        'application/json',
        'application/*+json',
        'application/yaml',
        'application/x-yaml',
        'text/yaml',
        'text/x-yaml',
        'text/*',
        'application/octet-stream',
        'application/x-www-form-urlencoded',
      ],
      parse: false,
      output: 'data',
      maxBytes: UNIT_PUT_MAX_BYTES,
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: streamsUnitIdentifierSchema.describe('The unit id.'),
    }),
    // parse:false yields a Buffer. The check always succeeds so the route
    // framework does not schema-validate the unit; the config distributor does.
    // The generic keeps repository-client PUTs typed as StreamsUnit.UpsertRequest.
    body: z.custom<StreamsUnit.UpsertRequest | Buffer>(() => true),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
    unitConfigHooks,
  }): Promise<{ acknowledged: true; compiled_config?: string; api_keys_may_remain?: true }> => {
    const {
      soClient,
      uiSettingsClient,
      encryptedSavedObjectsClient,
      canEncrypt,
      scopedClusterClient,
      isSecurityEnabled,
    } = await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const parsed = parseUnitPutBody({
      body: params.body,
      contentType: request.headers['content-type'],
    });

    const { ui_metadata: uiMetadata, secrets } = assertUnitPutEnvelope(parsed);

    const streamsUnitService = new StreamsUnitService({
      soClient,
      logger,
      validateUnit: unitConfigHooks.validate,
      publishUnit: unitConfigHooks.publish,
      prepareCredentials: unitConfigHooks.prepareCredentials,
      encryptedSavedObjectsClient,
      canEncrypt,
    });

    const { unit: previousUnit } = await streamsUnitService.getUnit(params.path.id);

    let apiKeysMayRemain = false;
    const { compiled_config: compiledConfig } = await streamsUnitService.upsertUnit({
      unitId: params.path.id,
      unit: parsed.unit,
      ui_metadata: uiMetadata,
      secrets,
      onPublished: async () => {
        ({ apiKeysMayRemain } = await revokeRemovedComponentApiKeys({
          client: scopedClusterClient.asCurrentUser,
          logger,
          isSecurityEnabled,
          previousUnit,
          nextUnit: parsed.unit,
        }));
      },
    });

    return {
      acknowledged: true,
      ...(compiledConfig !== undefined ? { compiled_config: compiledConfig } : {}),
      ...(apiKeysMayRemain ? { api_keys_may_remain: true } : {}),
    };
  },
});

export const resetStreamsUnitRoute = createServerRoute({
  endpoint: 'POST /internal/streams/unit/{id}/_reset',
  options: {
    access: 'internal',
    summary: 'Reset a Streams unit',
    description:
      'Deletes the stored unit configuration and UI metadata so the next GET is empty. Dev/WIP helper; does not notify config-distributor.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: unitPathSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<{ acknowledged: true; api_keys_may_remain?: true }> => {
    const { soClient, uiSettingsClient, scopedClusterClient, isSecurityEnabled } =
      await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const streamsUnitService = new StreamsUnitService({
      soClient,
      logger,
    });

    const { unit: previousUnit } = await streamsUnitService.getUnit(params.path.id);

    await streamsUnitService.resetUnit(params.path.id);

    const { apiKeysMayRemain } = await revokeRemovedComponentApiKeys({
      client: scopedClusterClient.asCurrentUser,
      logger,
      isSecurityEnabled,
      previousUnit,
      nextUnit: {},
    });

    return { acknowledged: true, ...(apiKeysMayRemain ? { api_keys_may_remain: true } : {}) };
  },
});

export const unitRoutes = {
  ...getStreamsUnitRoute,
  ...putStreamsUnitRoute,
  ...resetStreamsUnitRoute,
  ...resolveUnitIndicesRoute,
  ...indexMetadataRoute,
};
