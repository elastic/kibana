/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { isNotFoundError } from '@kbn/es-errors';
import { z } from '@kbn/zod';
import { createConcatStream, createListStream, createPromiseFromStreams } from '@kbn/utils';
import { installManagedIndexPattern } from '@kbn/fleet-plugin/server/services/epm/kibana/assets/install';
import {
  ContentPack,
  contentPackIncludedObjectsSchema,
  isIncludeAll,
  isSupportedSavedObjectType,
} from '@kbn/content-packs-schema';
import type { SavedObject } from '@kbn/core/server';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { Asset } from '../../../common';
import { DashboardAsset, DashboardLink } from '../../../common/assets';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { ASSET_ID, ASSET_TYPE } from '../../lib/streams/assets/fields';
import {
  CONTENT_NAME,
  STREAM_NAME,
  generateArchive,
  parseArchive,
  prepareForExport,
  prepareForImport,
  referenceManagedIndexPattern,
  savedObjectLinks,
} from '../../lib/content';
import { StoredContentPack } from '../../lib/content/content_client';

const MAX_CONTENT_PACK_SIZE_BYTES = 1024 * 1024 * 5; // 5MB

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
      replaced_patterns: z.array(z.string()),
      include: contentPackIncludedObjectsSchema,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
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

    const savedObjects: SavedObject[] = await createPromiseFromStreams([
      exportStream,
      createConcatStream([]),
    ]);
    const archive = await generateArchive(
      params.body,
      prepareForExport({
        savedObjects,
        source: params.path.name,
        replacedPatterns: params.body.replaced_patterns,
      })
    );

    return response.ok({
      body: archive,
      headers: {
        'Content-Disposition': `attachment; filename="${params.body.name}-${params.body.version}.zip"`,
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
      maxBytes: MAX_CONTENT_PACK_SIZE_BYTES,
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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  async handler({ params, request, getScopedClients, context }) {
    const { assetClient, soClient, streamsClient, contentClient } = await getScopedClients({
      request,
    });
    const importer = (await context.core).savedObjects.getImporter(soClient);

    await streamsClient.ensureStream(params.path.name);

    const contentPack = await parseArchive(params.body.content);
    const storedContentPack = await contentClient
      .getStoredContentPack(params.path.name, contentPack.name)
      .catch((err) => {
        if (isNotFoundError(err)) {
          return {
            [STREAM_NAME]: params.path.name,
            [CONTENT_NAME]: contentPack.name,
            dashboards: [],
          } as StoredContentPack;
        }

        throw err;
      });

    const savedObjectEntries = contentPack.entries.filter(isSupportedSavedObjectType);
    const links = savedObjectLinks(savedObjectEntries, storedContentPack);
    const savedObjects = prepareForImport({
      target: params.path.name,
      include: params.body.include,
      savedObjects: savedObjectEntries,
      links,
    });

    if (referenceManagedIndexPattern(savedObjects)) {
      // integration package's dashboards may reference pre-existing data views
      // that we need to install before import
      await installManagedIndexPattern({
        savedObjectsClient: soClient,
        savedObjectsImporter: importer,
      });
    }

    const { successResults, errors = [] } = await importer.import({
      readStream: createListStream(savedObjects),
      createNewCopies: false,
      overwrite: true,
    });

    await contentClient.upsertStoredContentPack(params.path.name, {
      name: contentPack.name,
      ...links,
    });

    const createdAssets: Array<Omit<DashboardLink, 'asset.uuid'>> =
      successResults
        ?.filter((savedObject) => savedObject.type === 'dashboard')
        .map((dashboard) => ({
          [ASSET_TYPE]: 'dashboard',
          [ASSET_ID]: dashboard.id,
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

const previewContentRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/content/preview',
  options: {
    access: 'internal',
    summary: 'Preview a content pack',
    description: 'Returns a json representation of a content pack.',
    body: {
      accepts: 'multipart/form-data',
      maxBytes: MAX_CONTENT_PACK_SIZE_BYTES,
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
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  async handler({ request, params, getScopedClients }): Promise<ContentPack> {
    const { streamsClient } = await getScopedClients({ request });
    await streamsClient.ensureStream(params.path.name);

    return await parseArchive(params.body.content);
  },
});

export const contentRoutes = {
  ...exportContentRoute,
  ...importContentRoute,
  ...previewContentRoute,
};
