/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The step of a dashboard update that failed. */
export const DASHBOARD_FAILURE_TYPES = {
  upsertDashboard: 'upsert_dashboard',
  validateDashboard: 'validate_dashboard',
  layout: 'layout',
} as const;

export type DashboardFailureType =
  (typeof DASHBOARD_FAILURE_TYPES)[keyof typeof DASHBOARD_FAILURE_TYPES];

/** What a failure is about: one panel, section or control, or the dashboard as a whole. */
export type DashboardFailureKind = 'panel' | 'section' | 'control' | 'dashboard';
