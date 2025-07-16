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
  contentPackIncludedObjectsSchema,
  isIncludeAll,
} from '@kbn/content-packs-schema';
import { Streams, getInheritedFieldsFromAncestors, isChildOf } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { generateArchive, parseArchive } from '../../lib/content';
import { prepareStreamsForExport, prepareStreamsForImport } from '../../lib/content/stream';

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
    const { streamsClient } = await getScopedClients({ request });

    const root = await streamsClient.getStream(params.path.name);
    if (!Streams.WiredStream.Definition.is(root)) {
      throw new StatusError('Only wired streams can be exported', 400);
    }

    if (!isIncludeAll(params.body.include)) {
      throw new StatusError('Streams subset is not implemented', 400);
    }

    const [ancestors, descendants] = await Promise.all([
      streamsClient.getAncestors(params.path.name),
      streamsClient.getDescendants(params.path.name),
    ]);

    const streamObjects = prepareStreamsForExport({
      root,
      descendants,
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
    const { streamsClient } = await getScopedClients({ request });

    const root = await streamsClient
      .getStream(params.path.name)
      .then(Streams.WiredStream.Definition.parse);

    const ancestors = await streamsClient.getAncestors(params.path.name);
    const inheritedFields = getInheritedFieldsFromAncestors(ancestors);

    const contentPack = await parseArchive(params.body.content);

    const definitions = prepareStreamsForImport({
      root,
      inheritedFields,
      entries: contentPack.entries.filter(
        (entry): entry is ContentPackStream => entry.type === 'stream'
      ),
    });

    await streamsClient.bulkChanges(
      definitions.map((definition) => ({
        type: 'upsert',
        definition,
      }))
    );

    return { errors: [], created: [] };
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
