/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DASHBOARD_FAILURE_TYPES = {
  addSection: 'add_section',
  addPanels: 'add_panels',
  addControls: 'add_controls',
  editPanels: 'edit_panels',
  movePanels: 'move_panels',
  layout: 'layout',
  validateDashboard: 'validate_dashboard',
} as const;

export type DashboardFailureType =
  (typeof DASHBOARD_FAILURE_TYPES)[keyof typeof DASHBOARD_FAILURE_TYPES];
