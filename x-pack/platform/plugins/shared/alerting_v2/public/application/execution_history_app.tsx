/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { ExecutionHistoryPage } from '../pages/execution_history_page/execution_history_page';
import { RequireAlertingV2Privilege } from '../components/require_alerting_v2_privilege';

export const ExecutionHistoryApp = () => {
  return (
    <RequireAlertingV2Privilege
      features={['executionHistory']}
      pageName={i18n.translate('xpack.alertingV2.executionHistoryApp.pageName', {
        defaultMessage: 'Execution history',
      })}
    >
      <Routes>
        <Route exact path="/">
          <ExecutionHistoryPage />
        </Route>
      </Routes>
    </RequireAlertingV2Privilege>
  );
};
