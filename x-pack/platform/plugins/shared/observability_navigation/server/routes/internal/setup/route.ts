/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SideNav } from '../../../../common/types';
import { createServerRoute } from '../../../create_server_route';

const PKG_NAME = 'kubernetes';

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
  async handler({ request, plugins }): Promise<SideNav | undefined> {
    const fleetStart = await plugins.fleet?.start();
    const packageClient = fleetStart?.packageService.asScoped(request);
    const installedPackage = await packageClient?.getInstallation(PKG_NAME);

    if (!installedPackage) {
      return undefined;
    }

    // Mock data simulating the installed package's items returned by installedPackage.installed_kibana
    const mockInstalledPackage = [
      {
        id: 'kubernetes-0a672d50-bcb1-11ec-b64f-7dd6e8e82013',
        entity: 'k8s.cronjob',
        sideNavTitle: 'Cronjobs',
        sideNavOrder: 900,
        type: 'dashboard',
      },
      {
        id: 'kubernetes-21694370-bcb2-11ec-b64f-7dd6e8e82013',
        entity: 'k8s.statefulset',
        sideNavTitle: 'StatefulSets',
        sideNavOrder: 600,
        type: 'dashboard',
      },
      {
        id: 'kubernetes-3912d9a0-bcb2-11ec-b64f-7dd6e8e82013',
        entity: 'k8s.volume',
        sideNavTitle: 'Volumes',
        sideNavOrder: 500,
        type: 'dashboard',
      },
      {
        id: 'kubernetes-3d4d9290-bcb1-11ec-b64f-7dd6e8e82013',
        entity: 'k8s.pod',
        sideNavTitle: 'Pods',
        sideNavOrder: 300,
        type: 'dashboard',
      },
      {
        id: 'kubernetes-5be46210-bcb1-11ec-b64f-7dd6e8e82013',
        entity: 'k8s.deployment',
        sideNavTitle: 'Deployments',
        sideNavOrder: 400,
        type: 'dashboard',
      },
      {
        id: 'kubernetes-85879010-bcb1-11ec-b64f-7dd6e8e82013',
        entity: 'k8s.daemonset',
        sideNavTitle: 'DaemonSets',
        sideNavOrder: 700,
        type: 'dashboard',
      },
      {
        id: 'kubernetes-9bf990a0-bcb1-11ec-b64f-7dd6e8e82013',
        entity: 'k8s.job',
        sideNavTitle: 'Jobs',
        sideNavOrder: 800,
        type: 'dashboard',
      },
      {
        id: 'kubernetes-b945b7b0-bcb1-11ec-b64f-7dd6e8e82013',
        entity: 'k8s.node',
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
        entity: 'k8s.service',
        sideNavTitle: 'Services',
        sideNavOrder: 800,
        type: 'dashboard',
      },
    ];

    // TODO: retrieve custom config from saved objects

    const sideNav =
      mockInstalledPackage
        .filter((p) => !!p.sideNavTitle)
        .sort((a, b) => (a.sideNavOrder ?? 0) - (b.sideNavOrder ?? 0)) ?? [];

    return {
      [PKG_NAME]:
        sideNav.map((kibana) => {
          return {
            title: kibana.sideNavTitle ?? 'missing title',
            entity: kibana.entity,
            dashboardId: kibana.id,
          };
        }) ?? [],
    };
  },
});

export const internalSetupRoutes = {
  ...infraSideNavRoute,
};
