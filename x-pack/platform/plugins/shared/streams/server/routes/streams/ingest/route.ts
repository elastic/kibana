/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badData, badRequest } from '@hapi/boom';
import { z } from '@kbn/zod';
import { StreamQuery, Streams } from '@kbn/streams-schema';
import { Ingest } from '@kbn/streams-schema/src/models/ingest';
import { WiredIngest } from '@kbn/streams-schema/src/models/ingest/wired';
import { UnwiredIngest } from '@kbn/streams-schema/src/models/ingest/unwired';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { ASSET_ID, ASSET_TYPE } from '../../../lib/streams/assets/fields';
import { QueryAsset } from '../../../../common/assets';
import { StreamsClient } from '../../../lib/streams/client';
import { AssetClient } from '../../../lib/streams/assets/asset_client';

async function getAssets({
  name,
  assetClient,
}: {
  name: string;
  assetClient: AssetClient;
}): Promise<{ dashboards: string[]; queries: StreamQuery[] }> {
  const assets = await assetClient.getAssets(name);

  const dashboards = assets
    .filter((asset) => asset[ASSET_TYPE] === 'dashboard')
    .map((asset) => asset[ASSET_ID]);

  const queries = assets
    .filter((asset): asset is QueryAsset => asset[ASSET_TYPE] === 'query')
    .map((asset) => asset.query);

  return {
    dashboards,
    queries,
  };
}

async function updateWiredIngest({
  streamsClient,
  assetClient,
  name,
  ingest,
}: {
  streamsClient: StreamsClient;
  assetClient: AssetClient;
  name: string;
  ingest: WiredIngest;
}) {
  const { dashboards, queries } = await getAssets({
    name,
    assetClient,
  });

  const definition = await streamsClient.getStream(name);

  if (!Streams.WiredStream.Definition.is(definition)) {
    throw badData(`Can't update wired capabilities of a non-wired stream`);
  }

  const { name: _name, ...stream } = definition;

  const upsertRequest: Streams.WiredStream.UpsertRequest = {
    dashboards,
    queries,
    stream: {
      ...stream,
      ingest,
    },
  };

  return await streamsClient.upsertStream({
    request: upsertRequest,
    name,
  });
}

async function updateUnwiredIngest({
  streamsClient,
  assetClient,
  name,
  ingest,
}: {
  streamsClient: StreamsClient;
  assetClient: AssetClient;
  name: string;
  ingest: UnwiredIngest;
}) {
  const { dashboards, queries } = await getAssets({
    name,
    assetClient,
  });

  const definition = await streamsClient.getStream(name);

  if (!Streams.UnwiredStream.Definition.is(definition)) {
    throw badData(`Can't update unwired capabilities of a non-unwired stream`);
  }

  const { name: _name, ...stream } = definition;

  const upsertRequest: Streams.UnwiredStream.UpsertRequest = {
    dashboards,
    queries,
    stream: {
      ...stream,
      ingest,
    },
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
      ingest: Ingest.right,
    }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { streamsClient, assetClient } = await getScopedClients({
      request,
    });

    const { name } = params.path;
    const { ingest } = params.body;

    const definition = await streamsClient.getStream(name);

    if (!Streams.ingest.all.Definition.is(definition)) {
      throw badData(`_ingest is only supported on Wired and Classic streams`);
    }

    if (WiredIngest.is(ingest)) {
      return await updateWiredIngest({ streamsClient, assetClient, name, ingest });
    }

    return await updateUnwiredIngest({ streamsClient, assetClient, name, ingest });
  },
});

export const ingestRoutes = {
  ...readIngestRoute,
  ...upsertIngestRoute,
};
