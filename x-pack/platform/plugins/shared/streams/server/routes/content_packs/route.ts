/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { z } from '@kbn/zod';
import {
  createConcatStream,
  createListStream,
  createMapStream,
  createPromiseFromStreams,
} from '@kbn/utils';
import { createSavedObjectsStreamFromNdJson } from '@kbn/core/packages/saved-objects/server-internal/src/routes/utils';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';

const downloadContentPacksRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/content_packs',
  options: {
    access: 'internal',
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler({ params, request, response, getScopedClients, context }) {
    const { assetClient, soClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const dashboards = await assetClient
      .getAssets({ entityId: params.path.name, entityType: 'stream' })
      .then((assets) => assets.filter(({ assetType }) => assetType === 'dashboard'));
    if (dashboards.length === 0) {
      throw new StatusError(`No dashboards are linked to [${params.path.name}] stream`, 400);
    }

    const exporter = (await context.core).savedObjects.getExporter(soClient);
    const exportStream = await exporter.exportByObjects({
      request,
      objects: dashboards.map((dashboard) => ({ id: dashboard.assetId, type: 'dashboard' })),
      includeReferencesDeep: true,
    });

    const savedObjects: string[] = await createPromiseFromStreams([
      exportStream,
      createMapStream((savedObject) => {
        return JSON.stringify(savedObject);
      }),
      createConcatStream([]),
    ]);

    return response.ok({
      body: savedObjects.join('\n'),
      headers: {
        'Content-Disposition': `attachment; filename="content_pack.ndjson"`,
        'Content-Type': 'application/ndjson',
      },
    });
  },
});

const uploadContentPacksRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/content_packs',
  options: {
    access: 'internal',
    body: {
      accepts: 'multipart/form-data',
      output: 'stream',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      content_pack: z.instanceof(Readable),
    }),
  }),
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler({ params, request, getScopedClients, context }) {
    const { assetClient, soClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const updatedSavedObjectsStream = await createPromiseFromStreams([
      await createSavedObjectsStreamFromNdJson(params.body.content_pack),
      createConcatStream([]),
    ]);

    const importer = (await context.core).savedObjects.getImporter(soClient);
    const { successResults, errors } = await importer.import({
      readStream: createListStream(updatedSavedObjectsStream),
      createNewCopies: true,
      overwrite: true,
    });

    const createdAssets = (successResults ?? [])
      .filter((savedObject) => savedObject.type === 'dashboard')
      .map((dashboard) => ({
        assetType: 'dashboard' as const,
        assetId: dashboard.destinationId ?? dashboard.id,
      }));

    if (createdAssets.length > 0) {
      await assetClient.bulk(
        { entityId: params.path.name, entityType: 'stream' },
        createdAssets.map((asset) => ({
          index: { asset },
        }))
      );
    }

    return { errors, created: createdAssets };
  },
});

export const contentPacksRoutes = {
  ...downloadContentPacksRoute,
  ...uploadContentPacksRoute,
};
