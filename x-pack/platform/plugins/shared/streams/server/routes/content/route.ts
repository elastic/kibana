/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { z } from '@kbn/zod';
import {
  ContentPack,
  ContentPackStream,
  ROOT_STREAM_ID,
  contentPackIncludedObjectsSchema,
  isIncludeAll,
} from '@kbn/content-packs-schema';
import { Streams, getInheritedFieldsFromAncestors } from '@kbn/streams-schema';
import { omit } from 'lodash';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { generateArchive, parseArchive } from '../../lib/content';
import {
  prepareStreamsForExport,
  prepareStreamsForImport,
  resolveAncestors,
  withRootPrefix,
} from '../../lib/content/stream';
import { AssetClient } from '../../lib/streams/assets/asset_client';

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
      include: contentPackIncludedObjectsSchema,
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  async handler({ params, request, response, getScopedClients, context }) {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    const root = await streamsClient.getStream(params.path.name);
    if (!Streams.WiredStream.Definition.is(root)) {
      throw new StatusError('Only wired streams can be exported', 400);
    }

    const [ancestors, descendants] = await Promise.all([
      streamsClient.getAncestors(params.path.name),
      streamsClient.getDescendants(params.path.name),
    ]);

    const exportedDescendants = isIncludeAll(params.body.include)
      ? descendants
      : resolveAncestors(params.body.include.objects.streams).map((name) => {
          const descendant = descendants.find((d) => d.name === withRootPrefix(root.name, name));
          if (!descendant) {
            throw new StatusError(
              `Could not find [${name}] as a descendant of [${root.name}]`,
              400
            );
          }
          return descendant;
        });

    const streamObjects = prepareStreamsForExport({
      root: await asContentPackEntry({ stream: root, assetClient }),
      descendants: await Promise.all(
        exportedDescendants.map((stream) => asContentPackEntry({ stream, assetClient }))
      ),
      inheritedFields: getInheritedFieldsFromAncestors(ancestors),
    });

    const archive = await generateArchive(params.body, streamObjects);

    return response.ok({
      body: archive,
      headers: {
        'Content-Disposition': `attachment; filename="${params.body.name}-${params.body.version}.zip"`,
        'Content-Type': 'application/zip',
      },
    });
  },
});

async function asContentPackEntry({
  stream,
  assetClient,
}: {
  stream: Streams.WiredStream.Definition;
  assetClient: AssetClient;
}): Promise<ContentPackStream> {
  return {
    type: 'stream' as const,
    name: stream.name,
    request: { stream: { ...omit(stream, ['name']) }, dashboards: [], queries: [] },
  };
}

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
  async handler({ params, request, getScopedClients }) {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    const root = await streamsClient
      .getStream(params.path.name)
      .then(Streams.WiredStream.Definition.parse);

    const ancestors = await streamsClient.getAncestors(params.path.name);
    const inheritedFields = getInheritedFieldsFromAncestors(ancestors);

    const contentPack = await parseArchive(params.body.content);
    const parentEntry = contentPack.entries.find(
      (entry): entry is ContentPackStream =>
        entry.type === 'stream' && entry.name === ROOT_STREAM_ID
    );
    if (!parentEntry) {
      throw new StatusError(`[${ROOT_STREAM_ID}] definition not found`, 400);
    }

    const importedStreamEntries = isIncludeAll(params.body.include)
      ? contentPack.entries.filter((entry): entry is ContentPackStream => entry.type === 'stream')
      : [
          parentEntry,
          ...resolveAncestors(params.body.include.objects.streams).map((name) => {
            const descendant = contentPack.entries.find(
              (entry): entry is ContentPackStream => entry.type === 'stream' && entry.name === name
            );
            if (!descendant) {
              throw new StatusError(`Could not find definition for stream [${name}]`, 400);
            }
            return descendant;
          }),
        ];

    const streams = prepareStreamsForImport({
      root: await asContentPackEntry({ stream: root, assetClient }),
      entries: importedStreamEntries,
      inheritedFields,
    });

    return await streamsClient.bulkUpsert(streams);
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
