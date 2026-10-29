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
import { ImportsPage } from '../pages/imports_page/imports_page';
import { RequireAlertingPrivilege } from '../components/require_alerting_privilege';
import { useAlertingV2ExperimentalFeatures } from '../hooks/use_alerting_v2_experimental_features';

/**
 * POC: Import alerts. Gated by the per-space Alerting v2 experimental features setting, and sends
 * the user back to the host's landing page when it is off.
 */
export const ImportsApp = () => {
  const { path } = useRouteMatch();
  const showExperimentalFeatures = useAlertingV2ExperimentalFeatures();

  if (!showExperimentalFeatures) {
    return <Redirect to="/" />;
  }

  return (
    <RequireAlertingPrivilege
      features={['rules']}
      pageName={i18n.translate('xpack.alertingV2.imports.appPageName', {
        defaultMessage: 'Import alerts',
      })}
    >
      <Routes>
        <Route exact path={path}>
          <ImportsPage />
        </Route>
      </Routes>
    </RequireAlertingPrivilege>
  );
};
