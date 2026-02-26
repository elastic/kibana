/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATUS_DEPRECATED = 'deprecated';
export type IntegrationStatusFilterType = typeof STATUS_DEPRECATED;

export interface BrowseIntegrationsFilter {
  q?: string;
  sort?: BrowseIntegrationSortType;
  status?: IntegrationStatusFilterType[];
}

export type BrowseIntegrationSortType = 'recent-old' | 'old-recent' | 'a-z' | 'z-a';
