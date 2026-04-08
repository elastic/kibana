/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';

export const resetFeaturesRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_significant_events/features/_reset',
  options: {
    access: 'internal',
    summary: 'Reset knowledge indicators data',
    description:
      'Deletes all knowledge indicator data and the backing index template. The index is lazily recreated with the latest mappings on the next write.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients, server }): Promise<{ acknowledged: boolean }> => {
    const { featureClient, licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    await featureClient.clean();

    return { acknowledged: true };
  },
});

export const resetFeaturesRoutes = {
  ...resetFeaturesRoute,
};
