/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';

import { INTEGRATIONS_ROUTING_PATHS } from '../../../../constants';
import { PermissionsError } from '../../../../../fleet/layouts';

import type { FleetStart, FleetStartServices } from '../../../../../../plugin';

import { AssetsPage } from './assets';
import { OverviewPage } from './overview';
import { PackagePoliciesPage } from './policies';
import { SettingsPage } from './settings';
import { CustomViewPage } from './custom';
import { DocumentationPage } from './documentation';
import { Configs } from './configs';

export const TabsContent: React.FC<{
  canReadIntegrationPolicies: boolean;
  integrationInfo: any;
  latestGAVersion: string | undefined;
  packageInfo: any;
  packageInfoData: any;
  panel: string;
  refetchPackageInfo: () => void;
  routesEnabled: boolean;
  services: FleetStartServices & {
    fleet?: FleetStart | undefined;
  };
}> = ({
  canReadIntegrationPolicies,
  integrationInfo,
  latestGAVersion,
  packageInfo,
  packageInfoData,
  panel,
  refetchPackageInfo,
  routesEnabled,
  services,
}) => {
  const routesMap = {
    overview: {
      path: INTEGRATIONS_ROUTING_PATHS.integration_details_overview,
      component: (
        <OverviewPage
          packageInfo={packageInfo}
          integrationInfo={integrationInfo}
          latestGAVersion={latestGAVersion}
        />
      ),
    },
    settings: {
      path: INTEGRATIONS_ROUTING_PATHS.integration_details_settings,
      component: (
        <SettingsPage
          packageInfo={packageInfo}
          packageMetadata={packageInfoData?.metadata}
          startServices={services}
        />
      ),
    },
    assets: {
      path: INTEGRATIONS_ROUTING_PATHS.integration_details_assets,
      component: <AssetsPage packageInfo={packageInfo} refetchPackageInfo={refetchPackageInfo} />,
    },
    configs: {
      path: INTEGRATIONS_ROUTING_PATHS.integration_details_configs,
      component: <Configs packageInfo={packageInfo} />,
    },
    policies: {
      path: INTEGRATIONS_ROUTING_PATHS.integration_details_policies,
      component: canReadIntegrationPolicies ? (
        <PackagePoliciesPage packageInfo={packageInfo} />
      ) : (
        <PermissionsError
          error="MISSING_PRIVILEGES"
          requiredFleetRole="Agent Policies Read and Integrations Read"
        />
      ),
    },
    custom: {
      path: INTEGRATIONS_ROUTING_PATHS.integration_details_custom,
      component: <CustomViewPage packageInfo={packageInfo} />,
    },
    apiReference: {
      path: INTEGRATIONS_ROUTING_PATHS.integration_details_api_reference,
      component: (
        <DocumentationPage packageInfo={packageInfo} integration={integrationInfo?.name} />
      ),
    },
  };
  return routesEnabled ? (
    <Routes>
      {Object.values(routesMap).map(({ path, component }) => (
        <Route key={path} path={path}>
          {component}
        </Route>
      ))}
      <Redirect to={INTEGRATIONS_ROUTING_PATHS.integration_details_overview} />
    </Routes>
  ) : (
    routesMap[panel].component
  );
};

TabsContent.displayName = 'TabsRoute';
