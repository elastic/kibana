/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { IntegrationType, IntegrationDashboardsResponse } from '../../../common/api_types';
import { createDatasetQualityServerRoute } from '../create_datasets_quality_server_route';
import { getIntegrations } from './get_integrations';
import { getIntegrationDashboards } from './get_integration_dashboards';

const integrationsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/integrations',
  options: {
    tags: [],
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler(resources): Promise<{
    integrations: IntegrationType[];
  }> {
    const { plugins, logger, request } = resources;

    const fleetPluginStart = await plugins.fleet.start();
    // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
    //   Review and choose one of the following options:
    //   A) Still unsure? Leave this comment as-is.
    //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
    //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
    //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
    const packageClient = fleetPluginStart.packageService.asScoped(request, { projectRouting: 'origin-only' });

    const integrations = await getIntegrations({ packageClient, logger });

    return { integrations };
  },
});

const integrationDashboardsRoute = createDatasetQualityServerRoute({
  endpoint: 'GET /internal/dataset_quality/integrations/{integration}/dashboards',
  params: t.type({
    path: t.type({
      integration: t.string,
    }),
  }),
  options: {
    tags: [],
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
    },
  },
  async handler(resources): Promise<IntegrationDashboardsResponse> {
    const { context, params, plugins, request } = resources;
    const { integration } = params.path;
    const { savedObjects } = await context.core;

    const fleetPluginStart = await plugins.fleet.start();
    // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
    //   Review and choose one of the following options:
    //   A) Still unsure? Leave this comment as-is.
    //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
    //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
    //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
    const packageClient = fleetPluginStart.packageService.asScoped(request, { projectRouting: 'origin-only' });

    const integrationDashboards = await getIntegrationDashboards(
      packageClient,
      savedObjects.client,
      integration
    );

    return {
      dashboards: integrationDashboards,
    };
  },
});

export const integrationsRouteRepository = {
  ...integrationsRoute,
  ...integrationDashboardsRoute,
};
