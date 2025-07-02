/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { conflict } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { NameTakenError } from '../../../lib/streams/errors/name_taken_error';
import { DisableStreamsResponse, EnableStreamsResponse } from '../../../lib/streams/client';
import { createServerRoute } from '../../create_server_route';

export const enableStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/_enable 2023-10-31',
  params: z.object({}),
  options: {
    access: 'public',
    summary: 'Enable streams',
    description: 'Enables wired streams',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({ request, getScopedClients }): Promise<EnableStreamsResponse> => {
    const { streamsClient } = await getScopedClients({
      request,
    });

    try {
      return await streamsClient.enableStreams();
    } catch (error) {
      if (error instanceof NameTakenError) {
        throw conflict(`Cannot enable Streams, failed to create root stream: ${error.message}`);
      }

      throw error;
    }
  },
});

export const disableStreamsRoute = createServerRoute({
  endpoint: 'POST /api/streams/_disable 2023-10-31',
  params: z.object({}),
  options: {
    access: 'public',
    summary: 'Disable streams',
    description:
      'Disables wired streams and deletes all existing stream definitions. The data of wired streams is deleted, but the data of classic streams is preserved.',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({ request, getScopedClients }): Promise<DisableStreamsResponse> => {
    const { streamsClient } = await getScopedClients({ request });

    return await streamsClient.disableStreams();
  },
});

export const enablementRoutes = {
  ...enableStreamsRoute,
  ...disableStreamsRoute,
};
