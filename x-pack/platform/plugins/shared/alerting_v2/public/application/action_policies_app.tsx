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
import { ListActionPoliciesPage } from '../pages/list_action_policies_page/list_action_policies_page';
import { ActionPolicyFormPage } from '../pages/action_policy_form_page/action_policy_form_page';
import { RequireAlertingPrivilege } from '../components/require_alerting_privilege';

export const ActionPoliciesApp = () => {
  const { path } = useRouteMatch();
  const base = path.endsWith('/') ? path.slice(0, -1) : path;
  return (
    <RequireAlertingPrivilege
      features={['actionPolicies']}
      pageName={i18n.translate('xpack.alertingV2.actionPoliciesApp.pageName', {
        defaultMessage: 'Action Policies',
      })}
    >
      <Routes>
        <Route exact path={`${base}/create`}>
          <RequireAlertingPrivilege
            features={['actionPolicies']}
            capability="all"
            pageName={i18n.translate('xpack.alertingV2.actionPoliciesApp.createPageName', {
              defaultMessage: 'Create action policy',
            })}
          >
            <ActionPolicyFormPage />
          </RequireAlertingPrivilege>
        </Route>
        <Route exact path={`${base}/edit/:id`}>
          <RequireAlertingPrivilege
            features={['actionPolicies']}
            capability="all"
            pageName={i18n.translate('xpack.alertingV2.actionPoliciesApp.editPageName', {
              defaultMessage: 'Edit action policy',
            })}
          >
            <ActionPolicyFormPage />
          </RequireAlertingPrivilege>
        </Route>
        <Route exact path={path}>
          <ListActionPoliciesPage />
        </Route>
      </Routes>
    </RequireAlertingPrivilege>
  );
};
