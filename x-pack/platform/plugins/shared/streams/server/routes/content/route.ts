/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { omit } from 'lodash';
import { z } from '@kbn/zod';
import {
  createConcatStream,
  createFilterStream,
  createListStream,
  createMapStream,
  createPromiseFromStreams,
} from '@kbn/utils';
import {
  ContentPack,
  IngestStreamLifecycleDSL,
  IngestStreamLifecycleILM,
  ProcessorDefinition,
  StreamUpsertRequest,
  contentPackSchema,
  isDslLifecycle,
  isIlmLifecycle,
  isIngestStreamDefinition,
  processorDefinitionSchema,
} from '@kbn/streams-schema';
import {
  ISavedObjectsExporter,
  KibanaRequest,
  SavedObject,
  SavedObjectsExportResultDetails,
} from '@kbn/core/server';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { getEffectiveLifecycle } from '../../lib/streams/lifecycle/get_effective_lifecycle';

type DashboardAsset = { type: 'dashboard'; id: string };
type ProcessorAsset = { type: 'processor'; processor: ProcessorDefinition };
type LifecycleAsset = { type: 'lifecycle' };

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
      assets: z.array(
        z.union([
          z.object({ type: z.literal('dashboard'), id: z.string() }),
          z.object({ type: z.literal('processor'), processor: processorDefinitionSchema }),
          z.object({ type: z.literal('lifecycle') }),
        ])
      ),
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
    const { soClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);
    const definition = await streamsClient.getStream(params.path.name);

    if (!isIngestStreamDefinition(definition)) {
      throw new StatusError('Only ingest streams are supported', 400);
    }

    const effectiveLifecycle = await getEffectiveLifecycle({
      definition,
      streamsClient,
      dataStream: await streamsClient.getDataStream(params.path.name),
    });

    const savedObjects = await exportSavedObjects({
      request,
      assets: params.body.assets,
      exporter: (await context.core).savedObjects.getExporter(soClient),
    });

    const exportedAssets = [
      ...savedObjects,
      ...params.body.assets
        .filter((asset) => asset.type === 'processor')
        .map((asset) => JSON.stringify(asset)),
      ...(params.body.assets.find((asset) => asset.type === 'lifecycle') &&
      (isDslLifecycle(effectiveLifecycle) || isIlmLifecycle(effectiveLifecycle))
        ? [JSON.stringify({ type: 'lifecycle', lifecycle: omit(effectiveLifecycle, ['from']) })]
        : []),
    ];

    return response.ok({
      body: { content: exportedAssets.join('\n') },
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
    const stream = await streamsClient.getStream(params.path.name);

    if (!isIngestStreamDefinition(stream)) {
      throw new StatusError('Only ingest stream are supported', 400);
    }

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

    const assetsToImport: (SavedObject | ProcessorAsset | LifecycleAsset)[] = body.content
      .split('\n')
      .map((line) => {
        const parsed = JSON.parse(line);
        return parsed;
      });

    const importer = (await context.core).savedObjects.getImporter(soClient);
    const { successResults, errors } = await importer.import({
      readStream: createListStream(assetsToImport.filter((asset) => asset.type === 'dashboard')),
      createNewCopies: true,
      overwrite: true,
    });

    const createdDashboards = (successResults ?? [])
      .filter((savedObject) => savedObject.type === 'dashboard')
      .map((dashboard) => ({
        type: 'dashboard' as const,
        id: dashboard.destinationId ?? dashboard.id,
      }));

    const existingDashboards = (
      await assetClient.getAssets({
        entityId: params.path.name,
        entityType: 'stream',
      })
    )
      .filter((asset) => asset.assetType === 'dashboard')
      .map((asset) => asset.assetId);

    const isProcessorAsset = (
      asset: SavedObject | ProcessorAsset | LifecycleAsset
    ): asset is ProcessorAsset => asset.type === 'processor';
    const isLifecycleAsset = (
      asset: SavedObject | ProcessorAsset | LifecycleAsset
    ): asset is LifecycleAsset & {
      lifecycle: IngestStreamLifecycleDSL | IngestStreamLifecycleILM;
    } => asset.type === 'lifecycle';
    const upsertRequest = {
      stream: {
        ingest: {
          ...stream.ingest,
          lifecycle: assetsToImport.find(isLifecycleAsset)?.lifecycle ?? stream.ingest.lifecycle,
          processing: [
            ...stream.ingest.processing,
            ...assetsToImport.filter(isProcessorAsset).map((asset) => asset.processor),
          ],
        },
      },
      dashboards: [...existingDashboards, ...createdDashboards.map((asset) => asset.id)],
    } as StreamUpsertRequest;

    await streamsClient.upsertStream({
      name: params.path.name,
      request: upsertRequest,
    });

    return {
      errors,
      created: [...createdDashboards, ...assetsToImport.filter(isProcessorAsset)],
    };
  },
});

async function exportSavedObjects({
  assets,
  exporter,
  request,
}: {
  assets: (DashboardAsset | ProcessorAsset | LifecycleAsset)[];
  exporter: ISavedObjectsExporter;
  request: KibanaRequest;
}): Promise<string[]> {
  const isDashboard = (asset: { type: string }): asset is DashboardAsset => {
    return asset.type === 'dashboard';
  };
  const savedObjects = assets.filter(isDashboard);
  if (savedObjects.length === 0) {
    return [];
  }

  const exportStream = await exporter.exportByObjects({
    request,
    objects: savedObjects,
    includeReferencesDeep: true,
  });

  return createPromiseFromStreams([
    exportStream,
    createFilterStream<SavedObject | SavedObjectsExportResultDetails>(
      (savedObject) =>
        !!savedObject &&
        (savedObject as SavedObjectsExportResultDetails).exportedCount === undefined
    ),
    createMapStream((savedObject) => {
      return JSON.stringify(savedObject);
    }),
    createConcatStream([]),
  ]);
}

export const contentRoutes = {
  ...exportContentRoute,
  ...importContentRoute,
};
