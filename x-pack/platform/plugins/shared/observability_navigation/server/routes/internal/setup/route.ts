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

    const otelData = await core.elasticsearch.client.asCurrentUser.search({
      index: 'metrics-*.otel-*',
      ignore_unavailable: true,
      allow_no_indices: true,
      track_total_hits: true,
      terminate_after: 1,
      size: 0,
      query: {
        bool: {
          filter: [{ term: { ['data_stream.dataset']: 'k8sclusterreceiver.otel' } }],
        },
      },
    });

    const totalHits = otelData?.hits?.total;
    const hasOtelData = typeof totalHits === 'number' ? totalHits !== 0 : totalHits?.value !== 0;

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

    const otelPackageInstalled = installedPackage ? [installedPackage] : [];

    if (hasOtelData && !installedPackage) {
      // We will just install the otel package if it is not installed for now
      await packageClient?.ensureInstalledPackage({ pkgName: 'kubernetes_otel' });
      const installedOtelKubernetes = await packageClient?.getInstallation('kubernetes_otel');
      if (installedOtelKubernetes) otelPackageInstalled.push(installedOtelKubernetes);
    }

    if ((!installedPackage || otelPackageInstalled.length === 0) && !navigationOverrides) {
      return [];
    }

    // It will come from the entities definiition later
    // For now we will just use the entities defined in the semconv
    const k8sEntitiesSemConv = [
      {
        id: 'entity.k8s.cluster', // -> Use to map to entityType?
        type: 'entity',
        stability: 'development',
        name: 'k8s.cluster',
        brief: 'A Kubernetes Cluster.',
        attributes: [{ ref: 'k8s.cluster.name' }, { ref: 'k8s.cluster.uid' }],
      },
      {
        id: 'entity.k8s.node',
        type: 'entity',
        stability: 'development',
        name: 'k8s.node',
        brief: 'A Kubernetes Node object.',
        attributes: [
          { ref: 'k8s.node.name' },
          { ref: 'k8s.node.uid' },
          {
            ref: 'k8s.node.label',
            requirement_level: 'opt_in',
          },
          {
            ref: 'k8s.node.annotation',
            requirement_level: 'opt_in',
          },
        ],
      },
    ];
    const otelMenuItems = k8sEntitiesSemConv.map((entity, index) => ({
      // id: `kubernetes_otel-${entity.id}`,
      id: `kubernetes_otel-cluster-overview`,
      entityType: entity.id,
      sideNavTitle: entity.brief,
      sideNavOrder: (index || 1) * 100,
      type: 'dashboard',
    }));

    // Mock data simulating the installed package's items returned by installedPackage.installed_kibana
    const mockInstalledPackage =
      installedPackage && otelPackageInstalled.length > 0 && hasOtelData
        ? [
            {
              id: 'kubernetes_otel-cluster-overview',
              entityType: 'k8s.overview',
              sideNavTitle: 'Overview (Otel)',
              sideNavOrder: 100,
              type: 'dashboard',
            },
          ]
        : [];

    const otelNavigationItemsSorted =
      [...otelMenuItems, ...mockInstalledPackage]
        .filter((p) => !!p.sideNavTitle)
        .sort((a, b) => (a.sideNavOrder ?? 0) - (b.sideNavOrder ?? 0)) ?? [];

    const integrationNavigation =
      otelNavigationItemsSorted.length > 0
        ? [
            {
              id: `${KUBERNETES.toLowerCase().replace(/[\.\s]/g, '-')}`,
              title: KUBERNETES,
              subItems: otelNavigationItemsSorted.map((item) => {
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
