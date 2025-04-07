/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { z } from '@kbn/zod';
import { createListStream } from '@kbn/utils';
import { installManagedIndexPattern } from '@kbn/fleet-plugin/server/services/epm/kibana/assets/install';
import { contentPackIncludedObjectsSchema, isIncludeAll } from '@kbn/content-packs-schema';
import { Asset } from '../../../common';
import { DashboardAsset, DashboardLink } from '../../../common/assets';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { ASSET_ID, ASSET_TYPE } from '../../lib/streams/assets/fields';
import { generateArchive, parseArchive } from '../../lib/content';

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
    body: z.object({
      name: z.string(),
      description: z.string(),
      version: z.string(),
      pattern_replacements: z.record(z.string(), z.string()),
      include: contentPackIncludedObjectsSchema,
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

    if (!isIncludeAll(params.body.include) && params.body.include.objects.dashboards.length === 0) {
      throw new StatusError(`Content pack must include at least one object`, 400);
    }

    function isDashboard(asset: Asset): asset is DashboardAsset {
      return asset[ASSET_TYPE] === 'dashboard';
    }

    const dashboards = (await assetClient.getAssets(params.path.name))
      .filter(isDashboard)
      .filter(
        (dashboard) =>
          isIncludeAll(params.body.include) ||
          params.body.include.objects.dashboards.includes(dashboard['asset.id'])
      );
    if (dashboards.length === 0) {
      throw new StatusError('No included objects were found', 400);
    }

    const exporter = (await context.core).savedObjects.getExporter(soClient);
    const exportStream = await exporter.exportByObjects({
      request,
      objects: dashboards.map((dashboard) => ({ id: dashboard[ASSET_ID], type: 'dashboard' })),
      includeReferencesDeep: true,
    });

    const archive = await generateArchive(
      params.body,
      exportStream,
      params.body.pattern_replacements
    );

    return response.ok({
      body: archive,
      headers: {
        'Content-Disposition': `attachment; filename="${params.body.name}.zip"`,
        'Content-Type': 'application/zip',
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
      maxBytes: 2000000,
      output: 'stream',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      include: z
        .string()
        .transform((value) => contentPackIncludedObjectsSchema.parse(JSON.parse(value))),
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

    const contentPack = await parseArchive(params.body.content);

    const importer = (await context.core).savedObjects.getImporter(soClient);

    await installManagedIndexPattern({
      savedObjectsClient: soClient,
      savedObjectsImporter: importer,
    });

    const { successResults, errors } = await importer.import({
      readStream: createListStream(
        contentPack.entries.filter(
          (entry) =>
            isIncludeAll(params.body.include) ||
            (entry.type === 'dashboard' &&
              params.body.include.objects.dashboards.includes(entry.id))
        )
      ),
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
