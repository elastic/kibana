/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../common/constants';
import type { Asset, SloAsset } from '../../../common/assets';
import { createServerRoute } from '../create_server_route';
import { ASSET_ID, ASSET_TYPE } from '../../lib/streams/assets/fields';

export interface SanitizedSloAsset {
  id: string;
  title: string;
  tags: string[];
}

export interface ListSlosResponse {
  slos: SanitizedSloAsset[];
}

export interface LinkSloResponse {
  acknowledged: boolean;
}

export interface UnlinkSloResponse {
  acknowledged: boolean;
}

function sanitizeSloAsset(asset: SloAsset): SanitizedSloAsset {
  return {
    id: asset[ASSET_ID],
    title: asset.title,
    tags: asset.tags,
  };
}

const listSlosRoute = createServerRoute({
  endpoint: 'GET /api/streams/{name}/slos 2023-10-31',
  options: {
    access: 'public',
    summary: 'Get stream SLOs',
    description:
      'Fetches all SLOs linked to a stream that are visible to the current user in the current space.',
    availability: {
      stability: 'experimental',
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
  }),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  async handler({ params, request, getScopedClients }): Promise<ListSlosResponse> {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    await streamsClient.ensureStream(params.path.name);

    const {
      path: { name: streamName },
    } = params;

    function isSlo(asset: Asset): asset is SloAsset {
      return asset[ASSET_TYPE] === 'slo';
    }

    return {
      slos: (await assetClient.getAssets(streamName)).filter(isSlo).map(sanitizeSloAsset),
    };
  },
});

const linkSloRoute = createServerRoute({
  endpoint: 'PUT /api/streams/{name}/slos/{sloId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Link a SLO to a stream',
    description: 'Links a SLO to a stream. Noop if the SLO is already linked to the stream.',
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
      sloId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<LinkSloResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });
    const {
      path: { sloId, name: streamName },
    } = params;

    await streamsClient.ensureStream(streamName);

    await assetClient.linkAsset(streamName, {
      [ASSET_TYPE]: 'slo',
      [ASSET_ID]: sloId,
    });

    return {
      acknowledged: true,
    };
  },
});

const unlinkSloRoute = createServerRoute({
  endpoint: 'DELETE /api/streams/{name}/slos/{sloId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Unlink a SLO from a stream',
    description: 'Unlinks a SLO from a stream. Noop if the SLO is not linked to the stream.',
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
      sloId: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<UnlinkSloResponse> => {
    const { assetClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      path: { sloId, name: streamName },
    } = params;

    await assetClient.unlinkAsset(streamName, {
      [ASSET_ID]: sloId,
      [ASSET_TYPE]: 'slo',
    });

    return {
      acknowledged: true,
    };
  },
});

export const sloRoutes = {
  ...listSlosRoute,
  ...linkSloRoute,
  ...unlinkSloRoute,
};
