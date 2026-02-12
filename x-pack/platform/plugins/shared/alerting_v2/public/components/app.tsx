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
import RuleDetailsRoute from '../routes/rule_details_route';

export const App = () => {
  return (
    <Routes>
      <Route exact path="/edit/:id" component={CreateRulePage} />
      <Route exact path="/create" component={CreateRulePage} />
      <Route exact path="/:ruleId" component={RuleDetailsRoute} />
      <Route exact path="/" component={RulesListPage} />
    </Routes>
  );
};
