/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, isIlmLifecycle } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { ilmPhases } from '../../../../lib/streams/lifecycle/ilm_phases';
import { getEffectiveLifecycle } from '../../../../lib/streams/lifecycle/get_effective_lifecycle';
import { StatusError } from '../../../../lib/streams/errors/status_error';

const lifecycleStatsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/lifecycle/_stats',
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
    const name = params.path.name;

    const definition = await streamsClient.getStream(name);
    if (!Streams.ingest.all.Definition.is(definition)) {
      throw new StatusError('Lifecycle stats are only available for ingest streams', 400);
    }

    const dataStream = await streamsClient.getDataStream(name);
    const lifecycle = await getEffectiveLifecycle({ definition, streamsClient, dataStream });
    if (!isIlmLifecycle(lifecycle)) {
      throw new StatusError('Lifecycle stats are only available for ILM policy', 400);
    }

    const { policy } = await scopedClusterClient.asCurrentUser.ilm
      .getLifecycle({ name: lifecycle.ilm.policy })
      .then((policies) => policies[lifecycle.ilm.policy]);

    const [{ indices: indicesIlmDetails }, { indices: indicesStats = {} }] = await Promise.all([
      scopedClusterClient.asCurrentUser.ilm.explainLifecycle({ index: name }),
      scopedClusterClient.asCurrentUser.indices.stats({ index: dataStream.name }),
    ]);

    return { phases: ilmPhases({ policy, indicesIlmDetails, indicesStats }) };
  },
});

const lifecycleIlmExplainRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/lifecycle/_explain',
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
    const name = params.path.name;

    // verifies read privileges
    await streamsClient.getStream(name);

    return scopedClusterClient.asCurrentUser.ilm.explainLifecycle({
      index: name,
    });
  },
});

export const internalLifecycleRoutes = {
  ...lifecycleStatsRoute,
  ...lifecycleIlmExplainRoute,
};
