/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { WrongStreamTypeError } from '../../../../lib/streams/errors/wrong_stream_type_error';
import {
  checkAccess,
  getUnmanagedElasticsearchAssetDetails,
  getUnmanagedElasticsearchAssets,
} from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';

export const unmanagedAssetsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/_unmanaged_assets',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });

    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });

    if (!read) {
      throw new SecurityError(`Cannot read stream ${params.path.name}, insufficient privileges`);
    }

    const stream = await streamsClient.getStream(params.path.name);

    if (!Streams.ClassicStream.Definition.is(stream)) {
      throw new WrongStreamTypeError(
        `Stream definition for ${params.path.name} is not an classic stream`
      );
    }

    const dataStream = await streamsClient.getDataStream(params.path.name);

    const assets = await getUnmanagedElasticsearchAssets({
      dataStream,
      scopedClusterClient,
    });

    return getUnmanagedElasticsearchAssetDetails({
      assets,
      scopedClusterClient,
    });
  },
});
