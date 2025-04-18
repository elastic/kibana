/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSavedObjectsStreamFromNdJson } from '@kbn/core-saved-objects-server-internal/src/routes/utils';
import { ContentPack, contentPackSchema } from '@kbn/streams-schema';
import {
  createConcatStream,
  createListStream,
  createMapStream,
  createPromiseFromStreams,
} from '@kbn/utils';
import { z } from '@kbn/zod';
import { Readable } from 'stream';
import { Asset } from '../../../common';
import { DashboardAsset, DashboardLink } from '../../../common/assets';
import { ASSET_ID, ASSET_TYPE } from '../../lib/streams/assets/fields';
import { StatusError } from '../../lib/streams/errors/status_error';
import { createServerRoute } from '../create_server_route';

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

    function isDashboard(asset: Asset): asset is DashboardAsset {
      return asset[ASSET_TYPE] === 'dashboard';
    }

    const dashboards = (await assetClient.getAssets(params.path.name)).filter(isDashboard);
    if (dashboards.length === 0) {
      throw new StatusError(`No dashboards are linked to [${params.path.name}] stream`, 400);
    }

    const exporter = (await context.core).savedObjects.getExporter(soClient);
    const exportStream = await exporter.exportByObjects({
      request,
      objects: dashboards.map((dashboard) => ({ id: dashboard[ASSET_ID], type: 'dashboard' })),
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
      body: { content: savedObjects.join('\n') },
      headers: {
        'Content-Disposition': `attachment; filename="content.json"`,
        'Content-Type': 'application/json',
      },
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

    const body: ContentPack = await new Promise((resolve, reject) => {
      let data = '';
      params.body.content.on('data', (chunk) => (data += chunk));
      params.body.content.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(contentPackSchema.parse(parsed));
        } catch (err) {
          reject(new StatusError('Invalid content pack format', 400));
        }
      });
      params.body.content.on('error', (error) => reject(error));
    });

    const updatedSavedObjectsStream = await createPromiseFromStreams([
      await createSavedObjectsStreamFromNdJson(Readable.from(body.content)),
      createConcatStream([]),
    ]);

    const importer = (await context.core).savedObjects.getImporter(soClient);
    const { successResults, errors } = await importer.import({
      readStream: createListStream(updatedSavedObjectsStream),
      createNewCopies: true,
      overwrite: true,
    });

    const createdAssets: Array<Omit<DashboardLink, 'asset.uuid'>> =
      successResults
        ?.filter((savedObject) => savedObject.type === 'dashboard')
        .map((dashboard) => ({
          [ASSET_TYPE]: 'dashboard',
          [ASSET_ID]: dashboard.destinationId ?? dashboard.id,
        })) ?? [];

    if (createdAssets.length > 0) {
      await assetClient.bulk(
        params.path.name,
        createdAssets.map((asset) => ({ index: { asset } }))
      );
    }

    return { errors, created: createdAssets };
  },
});

export const contentRoutes = {
  ...exportContentRoute,
  ...importContentRoute,
};
