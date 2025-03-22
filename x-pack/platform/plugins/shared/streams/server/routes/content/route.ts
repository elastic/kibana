/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough, Readable } from 'stream';
import { z } from '@kbn/zod';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { contentPackHeader } from '../../lib/content/content_pack_header';
import { exportSavedObjects } from '../../lib/content/export_saved_objects';
import { contentPackSavedObjects } from '../../lib/content/content_pack_saved_objects';
import { createContentPack } from '../../lib/content/create_content_pack';

const exportContentRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/content/export 2023-10-31',
  options: {
    access: 'public',
    summary: 'Export stream content',
    description: 'Exports the content associated to a stream.',
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
      .then((assets) =>
        assets
          .filter(({ assetType }) => assetType === 'dashboard')
          .map((asset) => ({ type: asset.assetType, id: asset.assetId }))
      );
    if (dashboards.length === 0) {
      throw new StatusError(`No dashboards are linked to [${params.path.name}] stream`, 400);
    }

    const savedObjects = await exportSavedObjects({
      request,
      objects: dashboards,
      exporter: (await context.core).savedObjects.getExporter(soClient),
    });

    return response.file({
      body: createContentPack(savedObjects),
      filename: 'content.ndjson',
      fileContentType: 'application/ndjson',
    });
  },
});

const importContentRoute = createServerRoute({
  endpoint: 'POST /api/streams/{name}/content/import 2023-10-31',
  options: {
    access: 'public',
    summary: 'Import content into a stream',
    description: 'Links content objects to a stream.',
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
      content: z.instanceof(Readable),
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

    const contents = tee(params.body.content);

    await contentPackHeader(contents[0]).catch(() => {
      throw new StatusError('Invalid content pack format', 400);
    });

    const importer = (await context.core).savedObjects.getImporter(soClient);
    const { successResults, errors } = await importer.import({
      readStream: contentPackSavedObjects(contents[1]),
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

const tee = (source: Readable): [Readable, Readable] => {
  return [source.pipe(new PassThrough()), source.pipe(new PassThrough())];
};

export const contentRoutes = {
  ...exportContentRoute,
  ...importContentRoute,
};
