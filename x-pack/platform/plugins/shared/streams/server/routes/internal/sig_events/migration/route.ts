/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { SigEventsV2MigrationStateStore } from '../../../../lib/sig_events/migration/migration_state';

export const getSigEventsV2MigrationStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/sig_events/migration/_status',
  options: {
    access: 'internal',
    summary: 'Get Significant Events v2 migration status',
    description:
      'Returns the status of the automatic v1→v2 rule migration that runs on Kibana start when alerting v2 is enabled.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients, server }) => {
    await getScopedClients({ request });
    const stateStore = new SigEventsV2MigrationStateStore(
      server.core.elasticsearch.client.asInternalUser,
      server.logger.get('sigevents-v2-migration')
    );
    return stateStore.getState();
  },
});

export const internalSigEventsMigrationRoutes = {
  ...getSigEventsV2MigrationStatusRoute,
};
