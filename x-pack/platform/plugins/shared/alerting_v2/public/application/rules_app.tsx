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
import { RuleDoctorPage } from '../pages/rule_doctor_page/rule_doctor_page';
import { RuleDoctorSettingsPage } from '../pages/rule_doctor_settings_page/rule_doctor_settings_page';
import { ExecutionDetailPage } from '../pages/rule_doctor_page/execution_detail_page';
import { FixPage } from '../pages/rule_doctor_page/fix_page';

export const RulesApp = () => {
  return (
    <Routes>
      <Route exact path="/doctor/settings">
        <RuleDoctorSettingsPage />
      </Route>
      <Route exact path="/doctor/fix/:findingId">
        <FixPage />
      </Route>
      <Route exact path="/doctor/executions/:executionId">
        <ExecutionDetailPage />
      </Route>
      <Route exact path="/doctor">
        <RuleDoctorPage />
      </Route>
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
