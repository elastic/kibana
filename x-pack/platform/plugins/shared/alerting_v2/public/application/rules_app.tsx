/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { EuiLoadingSpinner } from '@elastic/eui';
import { RulesListPage } from '../pages/rules_list_page/rules_list_page';
import { RuleDetailsRoute } from '../routes/rule_details_route';
import { RequireAlertingPrivilege } from '../components/require_alerting_privilege';

const SequenceBuilderPage = lazy(() =>
  import('../pages/sequence_builder_page').then((m) => ({ default: m.SequenceBuilderPage }))
);

const SequenceBuilderFallback = () => (
  <EuiLoadingSpinner
    size="xl"
    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
  />
);

export const RulesApp = () => {
  return (
    <RequireAlertingPrivilege
      features={['rules']}
      pageName={i18n.translate('xpack.alertingV2.rulesApp.pageName', { defaultMessage: 'Rules' })}
    >
      <Routes>
        <Route exact path="/sequence/create">
          <Suspense fallback={<SequenceBuilderFallback />}>
            <SequenceBuilderPage />
          </Suspense>
        </Route>

        <Route exact path="/:ruleId">
          <RuleDetailsRoute />
        </Route>
        <Route exact path="/">
          <RulesListPage />
        </Route>
      </Routes>
    </RequireAlertingPrivilege>
  );
};
