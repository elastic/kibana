/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { RulesListPage } from '../pages/rules_list_page/rules_list_page';
import { RuleDetailsRoute } from '../routes/rule_details_route';
import { RequireAlertingV2Privilege } from '../components/require_alerting_v2_privilege';

export const RulesApp = () => {
  return (
    <RequireAlertingV2Privilege
      features={['rules']}
      pageName={i18n.translate('xpack.alertingV2.rulesApp.pageName', { defaultMessage: 'Rules' })}
    >
      <Routes>
        <Route exact path="/:ruleId">
          <RuleDetailsRoute />
        </Route>
        <Route exact path="/">
          <RulesListPage />
        </Route>
      </Routes>
    </RequireAlertingV2Privilege>
  );
};
