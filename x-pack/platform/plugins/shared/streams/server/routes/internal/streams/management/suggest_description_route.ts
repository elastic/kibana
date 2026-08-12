/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { generateStreamDescription, overviewDescriptionPrompt } from '@kbn/streams-ai';
import { STREAMS_TIERED_ML_FEATURE } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { SecurityError } from '../../../../lib/streams/errors/security_error';
import { createServerRoute } from '../../../create_server_route';
import { getRequestAbortSignal } from '../../../utils/get_request_abort_signal';

const suggestDescriptionSchema = z.object({
  path: z.object({ name: z.string() }),
  body: z.object({
    connector_id: z.string(),
    start: z.number(),
    end: z.number(),
  }),
});

export const suggestDescriptionRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_suggest_description',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: suggestDescriptionSchema,
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<{ description: string }> => {
    const isAvailableForTier = server.core.pricing.isFeatureAvailable(STREAMS_TIERED_ML_FEATURE.id);
    if (!isAvailableForTier) {
      throw new SecurityError('Cannot access API on the current pricing tier');
    }

    const { inferenceClient, scopedClusterClient, streamsClient } = await getScopedClients({
      request,
    });

    const { connector_id: connectorId, start, end } = params.body;

    const stream = await streamsClient.getStream(params.path.name);

    const { description } = await generateStreamDescription({
      stream,
      start,
      end,
      esClient: scopedClusterClient.asCurrentUser,
      inferenceClient: inferenceClient.bindTo({ connectorId }),
      signal: getRequestAbortSignal(request),
      logger,
      systemPrompt: overviewDescriptionPrompt,
    });

    return { description };
  },
});
