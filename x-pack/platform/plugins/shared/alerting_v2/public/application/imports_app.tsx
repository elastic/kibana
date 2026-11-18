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
import { areAlertingV2ImportsEnabled } from '@kbn/alerting-v2-utils';
import { ImportsPage } from '../pages/imports_page/imports_page';
import { RequireAlertingPrivilege } from '../components/require_alerting_privilege';
import { RequiredPrivilegesPrompt } from '../components/required_privileges_prompt';

/**
 * Import alerts. Only reachable while Alerting v2 is enabled and the space has the
 * `alerting:v2:experimentalFeatures` setting on.
 */
export const ImportsApp = () => {
  const { path } = useRouteMatch();
  const settings = useService(CoreStart('settings'));
  const { capabilities } = useService(CoreStart('application'));
  const isEnabled = areAlertingV2ImportsEnabled(settings);
  // Listing the imports reads connectors, so that access is part of the page gate.
  const canReadConnectors = capabilities.actions?.show === true;
  const pageName = i18n.translate('xpack.alertingV2.importsApp.pageName', {
    defaultMessage: 'Import alerts',
  });

  if (!isEnabled) {
    return <Redirect to="/" />;
  }

  return (
    <RequireAlertingPrivilege features={['rules']} pageName={pageName}>
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
