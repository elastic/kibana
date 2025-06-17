/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NavigationOverridesSavedObject } from '../../../saved_objects/navigation_overrides';
import { OBSERVABILITY_NAVIGATION_OVERRIDES } from '../../../../common/saved_object_contants';
import { ObservabilityDynamicNavigation } from '../../../../common/types';
import { createServerRoute } from '../../../create_server_route';

const KUBERNETES = 'kubernetes';
const DOCKER = 'docker';
const METRICBEAT = 'metricbeat';

const infraSideNavRoute = createServerRoute({
  endpoint: 'GET /internal/observability_navigation',
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
  async handler({ request, plugins, context }): Promise<ObservabilityDynamicNavigation[]> {
    const [fleetStart, core] = await Promise.all([plugins.fleet?.start(), context.core]);
    const packageClient = fleetStart?.packageService.asScoped(request);

    const [installedPackage, ...navigationOverrides] = await Promise.all([
      packageClient?.getInstallation(KUBERNETES),
      core.savedObjects.client.get<NavigationOverridesSavedObject>(
        OBSERVABILITY_NAVIGATION_OVERRIDES,
        KUBERNETES
      ),
      core.savedObjects.client.get<NavigationOverridesSavedObject>(
        OBSERVABILITY_NAVIGATION_OVERRIDES,
        DOCKER
      ),
    ]);

    const metricbeatData = await core.elasticsearch.client.asCurrentUser.search({
      index: 'metrics-kubernetes*',
      ignore_unavailable: true,
      allow_no_indices: true,
      track_total_hits: true,
      terminate_after: 1,
      size: 0,
      query: {
        bool: {
          should: [
            { term: { ['event.module']: KUBERNETES } },
            { term: { ['agent.type']: METRICBEAT } },
          ],
          minimum_should_match: 1,
        },
      },
    });

    const otelData = await core.elasticsearch.client.asCurrentUser.search({
      index: 'metrics-*.otel-*',
      ignore_unavailable: true,
      allow_no_indices: true,
      track_total_hits: true,
      terminate_after: 1,
      size: 0,
      query: {
        bool: {
          filter: [{ term: { ['data_stream.dataset']: '*.otel' } }],
        },
      },
    });

    console.log('hasEcsData:', metricbeatData?.hits?.total?.value !== 0);
    console.log('hasOtelData:', otelData?.hits?.total?.value !== 0);

    // TODO
    const hasEcsData = metricbeatData?.hits?.total?.value !== 0;
    const hasOtelData = otelData?.hits?.total?.value !== 0;

    // Maybe separate the ecs / otel cases in the future
    // if ((hasEcsData || hasOtelData) && !installedPackage ) {
    //   return [
    //     {
    //       id: KUBERNETES,
    //       title: KUBERNETES,
    //       subItems: [
    //         {
    //           id: 'kubernetes',
    //           sideNavTitle: 'Add Kubernetes data',
    //           sideNavOrder: 100,
    //           type: 'dashboard',
    //         },
    //       ],
    //     },
    //   ];
    // }

    if (!installedPackage && !navigationOverrides) {
      return [];
    }

    // Mock data simulating the installed package's items returned by installedPackage.installed_kibana
    const mockInstalledPackage = installedPackage
      ? [
          {
            id: 'kubernetes-0a672d50-bcb1-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.cronjob',
            sideNavTitle: 'Cron jobs',
            sideNavOrder: 900,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-21694370-bcb2-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.statefulset',
            sideNavTitle: 'Stateful sets',
            sideNavOrder: 600,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-3912d9a0-bcb2-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.volume',
            sideNavTitle: 'Volumes',
            sideNavOrder: 500,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.pod',
            sideNavTitle: 'Pods',
            sideNavOrder: 300,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-5be46210-bcb1-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.deployment',
            sideNavTitle: 'Deployments',
            sideNavOrder: 400,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-85879010-bcb1-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.daemonset',
            sideNavTitle: 'Daemon sets',
            sideNavOrder: 700,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-9bf990a0-bcb1-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.job',
            sideNavTitle: 'Jobs',
            sideNavOrder: 800,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-b945b7b0-bcb1-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.node',
            sideNavTitle: 'Nodes',
            sideNavOrder: 200,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
            sideNavTitle: 'Overview',
            sideNavOrder: 100,
            type: 'dashboard',
          },
          {
            id: 'kubernetes-ff1b3850-bcb1-11ec-b64f-7dd6e8e82013',
            entityType: 'k8s.service',
            sideNavTitle: 'Services',
            sideNavOrder: 800,
            type: 'dashboard',
          },
        ]
      : [];

    const integrationSubItems =
      mockInstalledPackage
        .filter((p) => !!p.sideNavTitle)
        .sort((a, b) => (a.sideNavOrder ?? 0) - (b.sideNavOrder ?? 0)) ?? [];

    const integrationNavigation =
      integrationSubItems.length > 0
        ? [
            {
              id: `${KUBERNETES.toLowerCase().replace(/[\.\s]/g, '-')}`,
              title: KUBERNETES,
              subItems: integrationSubItems.map((item) => {
                return {
                  id: `${item.sideNavTitle.toLowerCase().replace(/[\.\s]/g, '-')}`,
                  title: item.sideNavTitle,
                  entityType: item.entityType,
                  dashboardId: item.id,
                };
              }),
            },
          ]
        : [];

    return (
      mergeNavigationItems(
        integrationNavigation,
        navigationOverrides.flatMap((item) => item.attributes)
      ) ?? []
    );
  },
});

function mergeNavigationItems(
  integrationNavigation: ObservabilityDynamicNavigation[],
  navigationOverridesItems: NavigationOverridesSavedObject[]
): ObservabilityDynamicNavigation[] {
  const overrideMap = new Map<string, ObservabilityDynamicNavigation>();

  // Flatten all override items into a map by id
  for (const override of navigationOverridesItems.flatMap((o) => o.navigation ?? [])) {
    overrideMap.set(override.id, override);
  }

  const resultMap = new Map<string, ObservabilityDynamicNavigation>();

  for (const integrationItem of integrationNavigation) {
    const overrideItem = overrideMap.get(integrationItem.id);

    if (!overrideItem) {
      resultMap.set(integrationItem.id, integrationItem);
      continue;
    }

    const subItemMap = new Map<
      string | undefined,
      NonNullable<ObservabilityDynamicNavigation['subItems']>[number]
    >();

    for (const subItem of integrationItem.subItems ?? []) {
      subItemMap.set(subItem.entityType, subItem);
    }

    for (const subItem of overrideItem.subItems ?? []) {
      subItemMap.set(subItem.entityType, subItem);
    }

    resultMap.set(integrationItem.id, {
      ...integrationItem,
      ...overrideItem,
      subItems: Array.from(subItemMap.values()),
    });

    overrideMap.delete(integrationItem.id);
  }

  for (const [id, overrideItem] of overrideMap.entries()) {
    resultMap.set(id, overrideItem);
  }

  return Array.from(resultMap.values());
}

export const internalSetupRoutes = {
  ...infraSideNavRoute,
};
