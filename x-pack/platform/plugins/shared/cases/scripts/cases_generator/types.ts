/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { CasePostRequest } from '../../common';

export interface KbnContext {
  kbnClient: KbnClient;
  headers: Record<string, string>;
}

export interface AlertInfo {
  alertId: string;
  index: string;
  ruleId: string;
  ruleName: string;
}

export interface EventInfo {
  eventId: string;
  index: string;
}

export interface CreatedAttachment {
  caseId: string;
  owner: string;
  type: 'user' | 'alert' | 'event';
  comment?: string;
  alertId?: string;
  eventId?: string;
  index?: string;
  rule?: { id: string; name: string };
}

export const TEMPLATE_FIELD_USER_TYPES = [
  'keyword',
  'integer',
  'boolean',
  'textarea',
  'date',
  'select',
  'checkbox',
  'radio',
  'user',
] as const;
export type TemplateFieldUserType = (typeof TEMPLATE_FIELD_USER_TYPES)[number];

export interface TemplateInput {
  name: string;
  description?: string;
  tags?: string[];
  fieldTypes: TemplateFieldUserType[];
}

export interface SpaceConfig {
  namePattern: string;
  count: number;
}

export interface GeneratorConfig {
  kibana: string;
  node: string;
  username: string;
  password: string;
  ssl: boolean;
  apiKey: string;
  space: string;
  owners: string[];
  count: number;
  comments: number;
  alerts: number;
  events: number;
  templates: TemplateInput[];
  templateOwners: string[];
  templateSpace: string;
  spaces: SpaceConfig | null;
  ownerDistribution: Record<string, number> | null;
  analyticsOwners: string[] | null;
  dryRun: boolean;
  seed: string | null;
  kibanaVersion: string;
  cleanup: boolean;
  cleanupTag: string;
  concurrency: number | null;
}

export interface GenerateCasesParams {
  cases: CasePostRequest[];
  space: string;
  commentsPerCase: number;
  alertsPerCase: number;
  eventsPerCase: number;
  alertsByOwner: Map<string, AlertInfo[]>;
  events: EventInfo[];
  concurrency: number | null;
}

export const VALID_OWNERS = ['securitySolution', 'observability', 'cases'] as const;
export type ValidOwner = (typeof VALID_OWNERS)[number];
