/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsEnhancedBaseActionFactoryContext } from '@kbn/ui-actions-enhanced-plugin/public';
import type { DashboardNavigationOptions } from '@kbn/dashboard-plugin/server';

export type DashboardDrilldownConfig = {
  dashboardId?: string;
} & DashboardNavigationOptions;

export type FactoryContext = UiActionsEnhancedBaseActionFactoryContext;
