/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { z } from '@kbn/zod';
import YAML from 'yaml';
import AdmZip from 'adm-zip';
import { createConcatStream, createListStream, createPromiseFromStreams } from '@kbn/utils';
import { ContentPackEntry, ContentPackManifest } from '@kbn/streams-schema';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { parseArchive } from '../../lib/content';

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

    const archive = await generateContentPack(params.body, exportStream);

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

    const contentPack = await parseArchive(params.body.content);

    const importer = (await context.core).savedObjects.getImporter(soClient);
    const { successResults, errors } = await importer.import({
      readStream: createListStream(
        contentPack.entries.filter((entry) => entry.type === 'dashboard')
      ),
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

const generateContentPack = async (manifest: ContentPackManifest, readStream: Readable) => {
  const zip = new AdmZip();
  const objects: any[] = await createPromiseFromStreams([readStream, createConcatStream([])]);

  objects.forEach((object: ContentPackEntry) => {
    if (object.type === 'dashboard') {
      zip.addFile(
        `kibana/dashboard/${object.id}.json`,
        Buffer.from(JSON.stringify(object, null, 2))
      );
    }
  });

  zip.addFile('manifest.yml', Buffer.from(YAML.stringify(manifest)));

  return zip.toBuffer();
};

export const contentRoutes = {
  ...exportContentRoute,
  ...importContentRoute,
};
