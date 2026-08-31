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
import { RulesV2TabLayout } from './rules_v2_tab_layout';
import { V1RulesPage } from './v1_rules_page';
import { MANAGEMENT_RULES_V1_TAB_PATH } from '../constants';

const SequenceBuilderPage = lazy(() =>
  import('../pages/sequence_builder_page').then((m) => ({ default: m.SequenceBuilderPage }))
);

const SequenceBuilderFallback = () => (
  <EuiLoadingSpinner
    size="xl"
    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
  />
);

export const RulesApp = ({ showRulesV2Tab = false }: { showRulesV2Tab?: boolean }) => {
  const routes = (
    <Routes>
      {showRulesV2Tab ? (
        <Route path={MANAGEMENT_RULES_V1_TAB_PATH}>
          <V1RulesPage />
        </Route>
      ) : null}
      <Route exact path="/sequence/create">
        <Suspense fallback={<SequenceBuilderFallback />}>
          <SequenceBuilderPage />
        </Suspense>
      </Route>

      <Route exact path="/:ruleId">
        <RuleDetailsRoute />
      </Route>
      <Route exact path="/">
        <RulesListPage hideManageV1Rules={showRulesV2Tab} />
      </Route>
    </Routes>
  );

  return (
    <RequireAlertingPrivilege
      features={['rules']}
      pageName={i18n.translate('xpack.alertingV2.rulesApp.pageName', { defaultMessage: 'Rules' })}
    >
      {showRulesV2Tab ? <RulesV2TabLayout>{routes}</RulesV2TabLayout> : routes}
    </RequireAlertingPrivilege>
  );
};
