/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface NavigationItemBase {
  id: string;
  title: string;
  entityType?: string;
  dashboardId?: string;
}

export interface DynamicNavigationItem extends NavigationItemBase {
  dashboardId: string;
}

export interface ObservabilityDynamicNavigation extends NavigationItemBase {
  subItems?: DynamicNavigationItem[];
}
