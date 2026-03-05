/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { CreateRulePage } from './create_rule_page';
import { RulesListPage } from './rules_list_page';
import { ListNotificationPoliciesPage } from '../pages/list_notification_policies_page/list_notification_policies_page';
import { NotificationPolicyFormPage } from '../pages/notification_policy_form_page/notification_policy_form_page';

export const App = () => {
  return (
    <Routes>
      <Route path="/edit/:id">
        <CreateRulePage />
      </Route>
      <Route path="/create">
        <CreateRulePage />
      </Route>
      <Route path="/notification_policies/create">
        <NotificationPolicyFormPage />
      </Route>
      <Route path="/notification_policies/edit/:id">
        <NotificationPolicyFormPage />
      </Route>
      <Route path="/notification_policies">
        <ListNotificationPoliciesPage />
      </Route>
      <Route path="/">
        <RulesListPage />
      </Route>
    </Routes>
  );
};
