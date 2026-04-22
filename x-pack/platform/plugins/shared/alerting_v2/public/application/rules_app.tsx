/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { RuleFormPage } from '../pages/rule_form_page/rule_form_page';
import { RulesListPage } from '../pages/rules_list_page/rules_list_page';
import { RuleDetailsRoute } from '../routes/rule_details_route';
import { RuleDoctorPage } from '../pages/rule_doctor_page/rule_doctor_page';
import { ExecutionDetailPage } from '../pages/rule_doctor_page/execution_detail_page';
import { FixPage } from '../pages/rule_doctor_page/fix_page';
import { useExperimentalFeaturesEnabled } from '../hooks/use_experimental_features';

const DoctorGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isEnabled = useExperimentalFeaturesEnabled();
  if (!isEnabled) {
    return <Redirect to="/" />;
  }
  return <>{children}</>;
};

export const RulesApp = () => {
  return (
    <Routes>
      <Route exact path="/doctor/fix/:findingId">
        <DoctorGuard>
          <FixPage />
        </DoctorGuard>
      </Route>
      <Route exact path="/doctor/executions/:executionId">
        <DoctorGuard>
          <ExecutionDetailPage />
        </DoctorGuard>
      </Route>
      <Route exact path="/doctor">
        <DoctorGuard>
          <RuleDoctorPage />
        </DoctorGuard>
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
