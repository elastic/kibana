/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityDynamicNavigation } from '../../../../common/types';
import { createServerRoute } from '../../../create_server_route';
import { getNavigationItems } from './get_navigation_items';

const infraSideNavRoute = createServerRoute({
  endpoint: 'GET /internal/observability/navigation',
  options: {
    access: 'internal',
    summary: 'Get observabilty dynamic side navigation',
    description: 'Fetches dynamic side navigation items',
    availability: {
      stability: 'experimental',
    },
  },
  security: {
    authz: {
      enabled: false,
      reason: 'The route is opted out of the authorization since it is a POC',
    },
  },
  async handler({ request, plugins, getScopedClients }): Promise<ObservabilityDynamicNavigation[]> {
    const { packageClient, soClient, scopedClusterClient } = await getScopedClients({ request });

    return getNavigationItems({
      packageClient,
      soClient,
      scopedClusterClient,
    });
  },
});

export const internalSetupRoutes = {
  ...infraSideNavRoute,
};
