/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATUS_DEPRECATED = 'deprecated';
export type IntegrationStatusFilterType = typeof STATUS_DEPRECATED;

export const SETUP_METHOD_AGENTLESS = 'agentless';
export const SETUP_METHOD_ELASTIC_AGENT = 'elastic_agent';
export type SetupMethodFilterType =
  | typeof SETUP_METHOD_AGENTLESS
  | typeof SETUP_METHOD_ELASTIC_AGENT;

import type { dataTypes } from '../../../../../../../common/constants';

export type SignalFilterType = (typeof dataTypes)[keyof typeof dataTypes];

export interface BrowseIntegrationsFilter {
  q?: string;
  sort?: BrowseIntegrationSortType;
  status?: IntegrationStatusFilterType[];
  setupMethod?: SetupMethodFilterType[];
  signal?: SignalFilterType[];
}

export type BrowseIntegrationSortType = 'recent-old' | 'old-recent' | 'a-z' | 'z-a';
