/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { z } from '@kbn/zod';
import type { ContentPack, ContentPackStream } from '@kbn/content-packs-schema';
import { contentPackIncludedObjectsSchema } from '@kbn/content-packs-schema';
import type { FieldDefinition } from '@kbn/streams-schema';
import { Streams, getInheritedFieldsFromAncestors } from '@kbn/streams-schema';
import { omit } from 'lodash';
import type { QueryLink } from '../../../common/assets';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { generateArchive, parseArchive } from '../../lib/content';
import {
  prepareStreamsForExport,
  prepareStreamsForImport,
  scopeContentPackStreams,
  scopeIncludedObjects,
} from '../../lib/content/stream';
import { baseFields } from '../../lib/streams/component_templates/logs_layer';
import { asTree } from '../../lib/content/stream/tree';

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
  async handler({ params, request, response, getScopedClients }) {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    const root = await streamsClient.getStream(params.path.name);
    if (!Streams.WiredStream.Definition.is(root)) {
      throw new StatusError('Only wired streams can be exported', 400);
    }

    const [ancestors, descendants] = await Promise.all([
      streamsClient.getAncestors(params.path.name),
      streamsClient.getDescendants(params.path.name),
    ]);

    const queryLinks = await assetClient.getAssetLinks(
      [params.path.name, ...descendants.map((stream) => stream.name)],
      ['query']
    );
    const inheritedFields = getInheritedFieldsFromAncestors(ancestors);

    const exportedTree = asTree({
      root: params.path.name,
      include: scopeIncludedObjects({
        root: params.path.name,
        include: params.body.include,
      }),
      streams: [root, ...descendants].map((stream) =>
        asContentPackEntry({ stream, queryLinks: queryLinks[stream.name] })
      ),
    });

    const streamObjects = prepareStreamsForExport({
      tree: exportedTree,
      inheritedFields: Object.keys(inheritedFields)
        .filter((field) => !baseFields[field])
        .reduce((fields, field) => {
          fields[field] = omit(inheritedFields[field], ['from']);
          return fields;
        }, {} as FieldDefinition),
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

function asContentPackEntry({
  stream,
  queryLinks,
}: {
  stream: Streams.WiredStream.Definition;
  queryLinks: QueryLink[];
}): ContentPackStream {
  return {
    type: 'stream' as const,
    name: stream.name,
    request: {
      stream: { ...omit(stream, ['name']) },
      queries: queryLinks.map(({ query }) => query),
      dashboards: [],
    },
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

    const root = await streamsClient.getStream(params.path.name);
    if (!Streams.WiredStream.Definition.is(root)) {
      throw new StatusError('Can only import content into wired streams', 400);
    }

    const contentPack = await parseArchive(params.body.content);

    const descendants = await streamsClient.getDescendants(params.path.name);
    const queryLinks = await assetClient.getAssetLinks(
      [params.path.name, ...descendants.map(({ name }) => name)],
      ['query']
    );

    const existingTree = asTree({
      root: params.path.name,
      include: { objects: { all: {} } },
      streams: [root, ...descendants].map((stream) =>
        asContentPackEntry({ stream, queryLinks: queryLinks[stream.name] })
      ),
    });

    const incomingTree = asTree({
      root: params.path.name,
      include: scopeIncludedObjects({
        root: params.path.name,
        include: params.body.include,
      }),
      streams: scopeContentPackStreams({
        root: params.path.name,
        streams: contentPack.entries.filter(
          (entry): entry is ContentPackStream => entry.type === 'stream'
        ),
      }),
    });

    const streams = prepareStreamsForImport({ existing: existingTree, incoming: incomingTree });

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
