/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useRouteMatch } from 'react-router-dom';
import { usePrivilegeCheck } from './privilege_check_context';
import { RequiredPrivilegesPrompt } from '../components/required_privileges_prompt';
import { getAlertingRequiredPrivileges } from '../lib/required_privileges';
import { RuleLibraryPage } from '../pages/rule_library_page/rule_library_page';
import { useRuleLibraryAccess } from '../pages/rule_library_page/use_rule_library_access';

const RULE_LIBRARY_PAGE_NAME = i18n.translate('xpack.alertingV2.ruleLibraryApp.pageName', {
  defaultMessage: 'Rule library',
});

export const RuleLibraryApp = () => {
  const { path } = useRouteMatch();
  const hostCheck = usePrivilegeCheck();
  const { canAccessV1, canAccessV2 } = useRuleLibraryAccess();
  // A host check is the sole authority, matching other alerting pages.
  // Management has no host check, so either classic or v2 rules access is enough.
  const hasAccess = hostCheck ? hostCheck(['rules'], 'read') : canAccessV1 || canAccessV2;

  if (!hasAccess) {
    return (
      <RequiredPrivilegesPrompt
        pageName={RULE_LIBRARY_PAGE_NAME}
        requiredPrivileges={getAlertingRequiredPrivileges(['rules'], 'read')}
      />
    );
  }

  return (
    <Routes>
      <Route exact path={path}>
        <RuleLibraryPage />
      </Route>
    </Routes>
  );
};
