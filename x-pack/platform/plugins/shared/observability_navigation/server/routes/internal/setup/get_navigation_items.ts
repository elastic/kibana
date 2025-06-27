/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PackageClient } from '@kbn/fleet-plugin/server';
import { IScopedClusterClient, SavedObjectsClientContract } from '@kbn/core/server';
import { NavigationOverridesSavedObject } from '../../../saved_objects/navigation_overrides';
import { OBSERVABILITY_NAVIGATION_OVERRIDES } from '../../../../common/saved_object_contants';
import { DynamicNavigationItem, ObservabilityDynamicNavigation } from '../../../../common/types';
import { getEntityDefinitions } from '../entity_definitions/get_entity_definitions';
import { getInstalledPackages } from './get_installed_packages';

const KUBERNETES = 'kubernetes';
const DOCKER = 'docker';

export async function getNavigationItems({
  packageClient,
  soClient,
  scopedClusterClient,
  includeEntityDefinitions = true,
}: {
  packageClient?: PackageClient;
  soClient: SavedObjectsClientContract;
  scopedClusterClient: IScopedClusterClient;
  includeEntityDefinitions?: boolean;
}): Promise<ObservabilityDynamicNavigation[]> {
  const [...installedPackages] = packageClient
    ? await getInstalledPackages({ packageClient, scopedClusterClient, ensureInstalled: true })
    : [];

  const [...navigationOverrides] = await Promise.all([
    soClient.get<NavigationOverridesSavedObject>(OBSERVABILITY_NAVIGATION_OVERRIDES, KUBERNETES),
    soClient.get<NavigationOverridesSavedObject>(OBSERVABILITY_NAVIGATION_OVERRIDES, DOCKER),
  ]);

  if (installedPackages.length === 0 && !navigationOverrides) {
    return [];
  }

  // Mock data simulating the installed package's items returned by installedPackage.installed_kibana
  const mockKubernetesInstalledPackage = installedPackages.some((pkg) => pkg?.name === KUBERNETES)
    ? [
        {
          id: 'kubernetes-0a672d50-bcb1-11ec-b64f-7dd6e8e82013',
          entityId: 'entity.k8s.cronjob',
          sideNavTitle: 'Cron jobs',
          sideNavOrder: 900,
          type: 'dashboard',
        },
        {
          id: 'kubernetes-21694370-bcb2-11ec-b64f-7dd6e8e82013',
          entityId: 'entity.k8s.statefulset',
          sideNavTitle: 'Stateful sets',
          sideNavOrder: 600,
          type: 'dashboard',
        },

        {
          id: 'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013',
          entityId: 'entity.k8s.pod',
          sideNavTitle: 'Pods',
          sideNavOrder: 300,
          type: 'dashboard',
        },
        {
          id: 'kubernetes-5be46210-bcb1-11ec-b64f-7dd6e8e82013',
          entityId: 'entity.k8s.deployment',
          sideNavTitle: 'Deployments',
          sideNavOrder: 400,
          type: 'dashboard',
        },
        {
          id: 'kubernetes-85879010-bcb1-11ec-b64f-7dd6e8e82013',
          entityId: 'entity.k8s.daemonset',
          sideNavTitle: 'Daemon sets',
          sideNavOrder: 700,
          type: 'dashboard',
        },
        {
          id: 'kubernetes-9bf990a0-bcb1-11ec-b64f-7dd6e8e82013',
          entityId: 'entity.k8s.job',
          sideNavTitle: 'Jobs',
          sideNavOrder: 800,
          type: 'dashboard',
        },
        {
          id: 'kubernetes-b945b7b0-bcb1-11ec-b64f-7dd6e8e82013',
          entityId: 'entity.k8s.node',
          sideNavTitle: 'Nodes',
          sideNavOrder: 200,
          type: 'dashboard',
        },
        {
          id: 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c',
          entityId: 'entity.k8s.cluster',
          sideNavTitle: 'Cluster',
          sideNavOrder: 100,
          type: 'dashboard',
        },
      ]
    : [];

  // Mock data simulating the installed package's items returned by installedPackage.installed_kibana
  const mockKubernetesOtelInstalledPackage = installedPackages.some(
    (pkg) => pkg?.name === `${KUBERNETES}_otel`
  )
    ? [
        {
          id: 'kubernetes_otel-cluster-overview',
          entityId: 'entity.k8s.cluster',
          sideNavTitle: 'Cluster',
          sideNavOrder: 100,
          type: 'dashboard',
        },
      ]
    : [];

  const entityDefinitions = includeEntityDefinitions
    ? await getEntityDefinitions({ namespace: KUBERNETES, soClient })
    : [];

  const navigationFromEntityDefinitions = entityDefinitions.map((entity, index) => ({
    id: `kubernetes_otel-cluster-overview`,
    entityId: entity.id,
    sideNavTitle: (entity.name.split('.').at(-1) ?? entity.name).replace(/^./, (c) =>
      c.toUpperCase()
    ),
    sideNavOrder: (index || 1) * 100,
    type: 'dashboard',
  }));

  const navigationsCombined = Array.from(
    new Map(
      [
        ...navigationFromEntityDefinitions,
        ...mockKubernetesInstalledPackage,
        ...mockKubernetesOtelInstalledPackage,
      ]
        .filter((p) => !!p.sideNavTitle)
        .map((item) => [item.entityId, item])
    ).values()
  );
  const integrationNavigation =
    navigationsCombined.length > 0
      ? [
          {
            id: formatId(KUBERNETES),
            title: KUBERNETES,
            href: `/${formatId(KUBERNETES)}`,
            subItems: navigationsCombined.map((item): DynamicNavigationItem => {
              const id = formatId(item.sideNavTitle);

              const navItem = {
                id,
                entityId: item.entityId,
                title: item.sideNavTitle,
                dashboardId: item.id,
                order: item.sideNavOrder,
                href: buildHref(id, formatId(KUBERNETES)),
              };

              return navItem;
            }),
          },
        ]
      : [];

  const mergedNavigationItems = mergeNavigationItems(
    integrationNavigation,
    navigationOverrides.flatMap((item) => item.attributes).flatMap((nav) => nav.navigation)
  );

  return mergedNavigationItems.map((item) => ({
    ...item,
    href: item.href
      ? appendQueryParams(item.href, {
          ...(item.entityId ? { entityId: item.entityId } : {}),
          ...(item.dashboardId ? { dashboardId: item.dashboardId } : {}),
        })
      : undefined,
    subItems: item.subItems?.map((subItem) => ({
      ...subItem,
      href: appendQueryParams(subItem.href, {
        ...(subItem.entityId ? { entityId: subItem.entityId } : {}),
        ...(subItem.dashboardId ? { dashboardId: subItem.dashboardId } : {}),
      }),
    })),
  }));
}

function formatId(id: string): string {
  return id.toLowerCase().replace(/[\.\s]/g, '-');
}

function buildHref(id: string, parent?: string): string {
  const href = `${parent ? `${parent}/` : ''}${id}`;

  return href;
}

function appendQueryParams(href: string, queryParams: Record<string, string>): string {
  const params = new URLSearchParams(queryParams);
  return `${href}?${params.toString()}`;
}

function mergeNavigationItems(
  integrationNavigation: ObservabilityDynamicNavigation[],
  navigationOverridesItems: ObservabilityDynamicNavigation[]
): ObservabilityDynamicNavigation[] {
  const overrideMap = new Map<string, ObservabilityDynamicNavigation>();

  for (const override of navigationOverridesItems) {
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
      subItemMap.set(subItem.entityId ?? subItem.id, subItem);
    }

    for (const subItem of overrideItem.subItems ?? []) {
      subItemMap.set(subItem.entityId ?? subItem.id, subItem);
    }

    resultMap.set(integrationItem.id, {
      ...integrationItem,
      ...overrideItem,
      subItems:
        Array.from(subItemMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) ?? [],
    });

    overrideMap.delete(integrationItem.id);
  }

  for (const [id, overrideItem] of overrideMap.entries()) {
    resultMap.set(id, overrideItem);
  }

  return Array.from(resultMap.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) ?? [];
}
