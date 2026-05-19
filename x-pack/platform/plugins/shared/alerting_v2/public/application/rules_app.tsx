/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { RuleFormPage } from '../pages/rule_form_page/rule_form_page';
import { RulesListPage } from '../pages/rules_list_page/rules_list_page';
import { RuleDetailsRoute } from '../routes/rule_details_route';

export const RulesApp = () => {
  return (
    <Routes>
      <Route path="/edit/:id">
        <RuleFormPage />
      </Route>
      <Route path="/create">
        <RuleFormPage />
      </Route>
      <Route exact path="/:ruleId">
        <RuleDetailsRoute />
      </Route>
      <Route exact path="/">
        <RulesListPage />
      </Route>
    </Routes>
  );
};
