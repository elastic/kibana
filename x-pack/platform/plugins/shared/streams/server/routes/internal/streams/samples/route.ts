/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SampleDocument } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { checkAccess } from '../../../../lib/streams/stream_crud';
import { createServerRoute } from '../../../create_server_route';

/**
 * Elasticsearch _sample API response format
 */
interface ESSampleHit {
  index: string;
  source: Record<string, any>;
}

interface ESSampleResponse {
  sample: ESSampleHit[];
}

/**
 * Transform Elasticsearch _sample API response to SampleDocument array
 */
function transformSampleResponse(response: ESSampleResponse): SampleDocument[] {
  return response.sample.map((hit) => hit.source);
}

const paramsSchema = z.object({
  path: z.object({ name: z.string() }),
});

export const getRawSamplesRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/samples/_raw',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: paramsSchema,
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    // Security check - verify user has read access to the stream
    const { read } = await checkAccess({ name: params.path.name, scopedClusterClient });
    if (!read) {
      throw new SecurityError(`Cannot read stream ${params.path.name}, insufficient privileges`);
    }

    // Call Elasticsearch _sample API
    const response = await scopedClusterClient.asCurrentUser.transport.request<ESSampleResponse>({
      method: 'GET',
      path: `/${params.path.name}/_sample`,
    });

    // Transform and return the samples
    return transformSampleResponse(response);
  },
});

export const internalSamplesRoutes = {
  ...getRawSamplesRoute,
};
