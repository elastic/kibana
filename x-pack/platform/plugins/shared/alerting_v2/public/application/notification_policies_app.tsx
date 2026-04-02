/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { ListNotificationPoliciesPage } from '../pages/list_notification_policies_page/list_notification_policies_page';
import { NotificationPolicyFormPage } from '../pages/notification_policy_form_page/notification_policy_form_page';

export const NotificationPoliciesApp = () => {
  return (
    <Routes>
      <Route exact path="/create">
        <NotificationPolicyFormPage />
      </Route>
      <Route exact path="/edit/:id">
        <NotificationPolicyFormPage />
      </Route>
      <Route exact path="/">
        <ListNotificationPoliciesPage />
      </Route>
    </Routes>
  );
};
