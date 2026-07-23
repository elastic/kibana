/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { resolveEsqlFromTargets } from '../../../lib/significant_events/investigation/resolve_esql_from_targets';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

/**
 * Used by the managed investigation workflow (`investigation_workflow.yaml`) to turn logical
 * stream names into ES|QL `FROM` targets before the agent kickoff message is built.
 */
const resolveEsqlTargetsRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/investigation/resolve_esql_targets',
  options: {
    access: 'internal',
    summary: 'Resolve stream names to ES|QL FROM targets',
    description:
      'Maps logical stream names to ES|QL FROM targets (query streams → $.view, ingest/classic → name).',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      stream_names: z.array(z.string().min(1).max(255)).max(100).default([]),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ esql_from_targets: string[] }> => {
    const { streamsClient, licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const esql_from_targets = await resolveEsqlFromTargets({
      streamNames: params.body.stream_names,
      getStream: (name) => streamsClient.getStream(name),
    });

    return { esql_from_targets };
  },
});

export const internalInvestigationRoutes = {
  ...resolveEsqlTargetsRoute,
};
