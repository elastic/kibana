/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { OBSERVABILITY_STREAMS_ENABLE_CANVAS } from '@kbn/management-settings-ids';
import type { StreamsUnit } from '@kbn/streams-schema';
import { streamsUnitIdentifierSchema, streamsUnitUpsertRequestSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { StreamsUnitService } from '../../../lib/saved_objects/streams_unit_service';
import { validateUnitForWrite } from '../../../lib/unit_config/validate_unit';
import { createServerRoute } from '../../create_server_route';

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
    body: streamsUnitUpsertRequestSchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
    unitConfigHooks,
  }): Promise<{ acknowledged: true }> => {
    const { soClient, uiSettingsClient, encryptedSavedObjectsClient, canEncrypt } =
      await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const { unit, ui_metadata: uiMetadata, secrets } = params.body as StreamsUnit.UpsertRequest;

    await validateUnitForWrite(unit, unitConfigHooks);

    const streamsUnitService = new StreamsUnitService({
      soClient,
      logger,
      publishUnit: unitConfigHooks.publish,
      encryptedSavedObjectsClient,
      canEncrypt,
    });

    await streamsUnitService.upsertUnit({
      unitId: params.path.id,
      unit,
      ui_metadata: uiMetadata,
      secrets,
    });

    return { acknowledged: true };
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
  }): Promise<{ acknowledged: true }> => {
    const { soClient, uiSettingsClient } = await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const streamsUnitService = new StreamsUnitService({
      soClient,
      logger,
    });

    await streamsUnitService.resetUnit(params.path.id);

    return { acknowledged: true };
  },
});

export const unitRoutes = {
  ...getStreamsUnitRoute,
  ...putStreamsUnitRoute,
  ...resetStreamsUnitRoute,
};
