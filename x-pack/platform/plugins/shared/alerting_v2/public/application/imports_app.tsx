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
import { CoreStart, useService } from '@kbn/core-di-browser';
import { areAlertingV2ImportsEnabled } from '@kbn/alerting-v2-utils';
import { RequireAlertingPrivilege } from '../components/require_alerting_privilege';

/**
 * Import alerts. Only reachable while Alerting v2 is enabled and the space has Agent Builder
 * experimental features on.
 */
export const ImportsApp = () => {
  const { path } = useRouteMatch();
  const settings = useService(CoreStart('settings'));
  const isEnabled = areAlertingV2ImportsEnabled(settings);

  if (!isEnabled) {
    return <Redirect to="/" />;
  }

  return (
    <RequireAlertingPrivilege
      features={['rules']}
      pageName={i18n.translate('xpack.alertingV2.importsApp.pageName', {
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
