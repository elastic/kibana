/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { ListActionPoliciesPage } from '../pages/list_action_policies_page/list_action_policies_page';
import { ActionPolicyFormPage } from '../pages/action_policy_form_page/action_policy_form_page';

export const ActionPoliciesApp = () => {
  return (
    <Routes>
      <Route exact path="/create">
        <ActionPolicyFormPage />
      </Route>
      <Route exact path="/edit/:id">
        <ActionPolicyFormPage />
      </Route>
      <Route exact path="/">
        <ListActionPoliciesPage />
      </Route>
    </Routes>
  );
};
