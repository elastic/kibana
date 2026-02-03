/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badData, badRequest } from '@hapi/boom';
import { z } from '@kbn/zod';
import type { StreamQuery } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import { WiredIngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest/wired';
import type { ClassicIngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest/classic';
import { IngestUpsertRequest } from '@kbn/streams-schema/src/models/ingest';
import type { AttachmentClient } from '../../../lib/streams/attachments/attachment_client';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { ASSET_TYPE } from '../../../lib/streams/assets/fields';
import type { Query } from '../../../../common/queries';
import type { StreamsClient } from '../../../lib/streams/client';
import type { QueryClient } from '../../../lib/streams/assets/query/query_client';

async function getAssets({
  name,
  queryClient,
  attachmentClient,
}: {
  name: string;
  queryClient: QueryClient;
  attachmentClient: AttachmentClient;
}): Promise<{ dashboards: string[]; queries: StreamQuery[]; rules: string[] }> {
  const [assets, attachments] = await Promise.all([
    queryClient.getAssets(name),
    attachmentClient.getAttachments(name),
  ]);

  const dashboards = attachments
    .filter((attachment) => attachment.type === 'dashboard')
    .map((attachment) => attachment.id);

  const queries = assets
    .filter((asset): asset is Query => asset[ASSET_TYPE] === 'query')
    .map((asset) => asset.query);

  const rules = attachments
    .filter((attachment) => attachment.type === 'rule')
    .map((attachment) => attachment.id);

  return {
    dashboards,
    queries,
    rules,
  };
}

async function updateWiredIngest({
  streamsClient,
  queryClient,
  attachmentClient,
  name,
  ingest,
}: {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  attachmentClient: AttachmentClient;
  name: string;
  ingest: WiredIngestUpsertRequest;
}) {
  const { dashboards, queries, rules } = await getAssets({
    name,
    queryClient,
    attachmentClient,
  });

  const definition = await streamsClient.getStream(name);

  if (!Streams.WiredStream.Definition.is(definition)) {
    throw badData(`Can't update wired capabilities of a non-wired stream`);
  }

  const { name: _name, updated_at: _updatedAt, ...stream } = definition;

  const upsertRequest: Streams.WiredStream.UpsertRequest = {
    dashboards,
    queries,
    stream: {
      ...stream,
      ingest,
    },
    rules,
  };

  return await streamsClient.upsertStream({
    request: upsertRequest,
    name,
  });
}

async function updateClassicIngest({
  streamsClient,
  queryClient,
  attachmentClient,
  name,
  ingest,
}: {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  attachmentClient: AttachmentClient;
  name: string;
  ingest: ClassicIngestUpsertRequest;
}) {
  const { dashboards, queries, rules } = await getAssets({
    name,
    queryClient,
    attachmentClient,
  });

  const definition = await streamsClient.getStream(name);

  if (!Streams.ClassicStream.Definition.is(definition)) {
    throw badData(`Can't update classic capabilities of a non-classic stream`);
  }

  const { name: _name, updated_at: _updatedAt, ...stream } = definition;

  const upsertRequest: Streams.ClassicStream.UpsertRequest = {
    dashboards,
    queries,
    stream: {
      ...stream,
      ingest,
    },
    rules,
  };

  return await streamsClient.upsertStream({
    request: upsertRequest,
    name,
  });
}

const readIngestRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/_ingest 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get ingest stream settings',
    description: 'Fetches the ingest settings of an ingest stream definition',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
  }): Promise<{ ingest: Streams.ingest.all.Definition['ingest'] }> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    const name = params.path.name;

    const definition = await streamsClient.getStream(name);

    if (Streams.ingest.all.Definition.is(definition)) {
      return { ingest: definition.ingest };
    }

    throw badRequest(`Stream is not an ingest stream`);
  },
});

const upsertIngestRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/_ingest 2023-10-31',
  options: {
    access: 'public',
    summary: 'Update ingest stream settings',
    description: 'Upserts the ingest settings of an ingest stream definition',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    body: z.object({
      ingest: IngestUpsertRequest.right,
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { streamsClient, queryClient, attachmentClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { ingest } = params.body;

    const definition = await streamsClient.getStream(name);

    if (!Streams.ingest.all.Definition.is(definition)) {
      throw badData(`_ingest is only supported on Wired and Classic streams`);
    }

    if (WiredIngestUpsertRequest.is(ingest)) {
      return await updateWiredIngest({
        streamsClient,
        queryClient,
        attachmentClient,
        name,
        ingest,
      });
    }

    return await updateClassicIngest({
      streamsClient,
      queryClient,
      attachmentClient,
      name,
      ingest,
    });
  },
});

export const ingestRoutes = {
  ...readIngestRoute,
  ...upsertIngestRoute,
};
