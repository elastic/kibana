/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { RuleLibraryPage } from '../pages/rule_library_page/rule_library_page';
import { RequireAlertingPrivilege } from '../components/require_alerting_privilege';

export const RuleLibraryApp = () => {
  return (
    <RequireAlertingPrivilege
      features={['rules']}
      pageName={i18n.translate('xpack.alertingV2.ruleLibraryApp.pageName', {
        defaultMessage: 'Rule library',
      })}
    >
      <Routes>
        <Route exact path="/">
          <RuleLibraryPage />
        </Route>
      </Routes>
    </RequireAlertingPrivilege>
  );
};
