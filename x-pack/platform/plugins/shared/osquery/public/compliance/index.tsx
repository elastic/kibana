/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { ComplianceDashboardPage } from './pages/compliance_dashboard_page';
import { FindingsExplorerPage } from './pages/findings_explorer_page';
import { RulesManagementPage } from './pages/rules_management_page';

export const ComplianceRoutes: React.FC = () => (
  <Routes>
    <Route path="/compliance/dashboard" component={ComplianceDashboardPage} />
    <Route path="/compliance/findings" component={FindingsExplorerPage} />
    <Route path="/compliance/rules" component={RulesManagementPage} />
    <Route path="/compliance" component={ComplianceDashboardPage} />
  </Routes>
);
