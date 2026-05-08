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

// User-facing control names. Each maps 1:1 to a real {control, type} pair in
// the cases template schema (see buildTemplateField in kibana_ops.ts).
//   text     → control: INPUT_TEXT,      value type: keyword
//   number   → control: INPUT_NUMBER,    value type: integer
//   textarea → control: TEXTAREA,        value type: keyword
//   date     → control: DATE_PICKER,     value type: date
//   select   → control: SELECT_BASIC,    value type: keyword
//   radio    → control: RADIO_GROUP,     value type: keyword
//   checkbox → control: CHECKBOX_GROUP,  value type: keyword
//   user     → control: USER_PICKER,     value type: keyword
export const TEMPLATE_FIELD_USER_TYPES = [
  'text',
  'number',
  'textarea',
  'date',
  'select',
  'radio',
  'checkbox',
  'user',
] as const;
export type TemplateFieldUserType = (typeof TEMPLATE_FIELD_USER_TYPES)[number];

export interface CreatedTemplateRef {
  id: string;
  version: number;
  fieldTypes: TemplateFieldUserType[];
}

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
