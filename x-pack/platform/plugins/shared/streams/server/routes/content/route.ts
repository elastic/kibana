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
  conflictResolutionSchema,
  contentPackIncludedObjectsSchema,
} from '@kbn/content-packs-schema';
import { FieldDefinition, Streams, getInheritedFieldsFromAncestors } from '@kbn/streams-schema';
import { omit } from 'lodash';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import { createServerRoute } from '../create_server_route';
import { StatusError } from '../../lib/streams/errors/status_error';
import { generateArchive, parseArchive } from '../../lib/content';
import {
  asContentPackEntry,
  flattenTree,
  mergeContentPack,
  prepareStreamsForExport,
  scopeIncludedObjects,
} from '../../lib/content/stream';
import { baseFields } from '../../lib/streams/component_templates/logs_layer';
import { asTree } from '../../lib/content/stream/tree';
import { isNotFoundError } from '@kbn/es-errors';
import { diffTrees } from '../../lib/content/stream/diff';

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
      resolutions: z
        .string()
        .transform((value) => z.array(conflictResolutionSchema).parse(JSON.parse(value))),
      content: z.instanceof(Readable),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  async handler({ params, request, getScopedClients }) {
    const { assetClient, contentClient, streamsClient } = await getScopedClients({ request });

    const root = await streamsClient.getStream(params.path.name);
    if (!Streams.WiredStream.Definition.is(root)) {
      throw new StatusError('Can only import content into wired streams', 400);
    }

    const contentPack = await parseArchive(params.body.content);
    const installation = await contentClient
      .getInstallation(params.path.name, contentPack.name)
      .catch((err) => {
        if (isNotFoundError(err)) {
          return undefined;
        }

        throw err;
      });

    const { incoming, merged, conflicts } = await mergeContentPack({
      root,
      assetClient,
      streamsClient,
      contentPack,
      installation,
      include: params.body.include,
      resolutions: params.body.resolutions,
    });

    const hasSystemResolvedConflicts = conflicts.some((streamConflicts) =>
      streamConflicts.conflicts.some(({ value: { source } }) => source === 'system')
    );
    if (hasSystemResolvedConflicts) {
      throw new StatusError('All conflicts must be resolved by user', 400);
    }

    const result = await streamsClient.bulkUpsert(flattenTree(merged));
    await contentClient.upsertInstallation(params.path.name, {
      name: contentPack.name,
      streams: flattenTree(incoming),
    });

    return result;
  },
});

const parseContentRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/content/parse',
  options: {
    access: 'internal',
    summary: 'Parse a content pack',
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

const previewContentRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/content/preview',
  options: {
    access: 'internal',
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
    const { assetClient, contentClient, streamsClient } = await getScopedClients({ request });

    const root = await streamsClient.getStream(params.path.name);
    if (!Streams.WiredStream.Definition.is(root)) {
      throw new StatusError('Can only import content into wired streams', 400);
    }

    const contentPack = await parseArchive(params.body.content);
    const installation = await contentClient
      .getInstallation(params.path.name, contentPack.name)
      .catch((err) => {
        if (isNotFoundError(err)) {
          return undefined;
        }

        throw err;
      });

    const { existing, merged, conflicts } = await mergeContentPack({
      root,
      assetClient,
      streamsClient,
      contentPack,
      installation,
      include: params.body.include,
      resolutions: [],
    });

    return { changes: diffTrees({ existing, merged }), conflicts };
  },
});

export const contentRoutes = {
  ...exportContentRoute,
  ...importContentRoute,
  ...parseContentRoute,
  ...previewContentRoute,
};
