/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { Redirect, useRouteMatch } from 'react-router-dom';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { ImportsPage } from '../pages/imports_page/imports_page';
import { useAlertingV2ExperimentalFeatures } from '../hooks/use_alerting_v2_experimental_features';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { RequireAlertingPrivilege } from '../components/require_alerting_privilege';
import { RequiredPrivilegesPrompt } from '../components/required_privileges_prompt';

/**
 * Import alerts. Only reachable while the space has the `alerting:v2:experimentalFeatures`
 * setting on. The host app is already inaccessible while `alerting:v2:enabled` is off.
 */
export const ImportsApp = () => {
  // Set here, above the privilege gates, so the interstitials show the page's breadcrumbs too.
  useBreadcrumbs('imports_list');
  const { path } = useRouteMatch();
  const { capabilities } = useService(CoreStart('application'));
  const isEnabled = useAlertingV2ExperimentalFeatures();
  // Listing the imports reads connectors, so that access is part of the page gate.
  const canReadConnectors = capabilities.actions?.show === true;
  const pageName = i18n.translate('xpack.alertingV2.importsApp.pageName', {
    defaultMessage: 'Import alerts',
  });

  if (!isEnabled) {
    return <Redirect to="/" />;
  }

  return (
    <RequireAlertingPrivilege features={['alerts']} pageName={pageName}>
      {canReadConnectors ? (
        <Routes>
          <Route exact path={path}>
            <ImportsPage />
          </Route>
        </Routes>
      ) : (
        <RequiredPrivilegesPrompt
          pageName={pageName}
          requiredPrivileges={[
            {
              featureId: 'actions',
              featureName: i18n.translate('xpack.alertingV2.importsApp.connectorsFeatureName', {
                defaultMessage: 'Actions and Connectors',
              }),
              privilege: 'read',
            },
          ]}
        />
      )}
    </RequireAlertingPrivilege>
  );
};
