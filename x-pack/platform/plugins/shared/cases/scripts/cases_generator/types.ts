/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { CasePostRequest } from '../../common';
import type { KitchenSinkFieldDef } from './kitchen_sink_template';

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
  // Synthesized field types from the --templateFieldTypes opt-out path.
  // Empty when the template was created from the kitchen-sink YAML default.
  fieldTypes: TemplateFieldUserType[];
  // Populated when the template was created from the kitchen-sink YAML so
  // data_generation can drive extended_fields off the real field defs
  // (names, types, validation) instead of the synthesized fieldA/B/… names.
  kitchenSinkFields?: readonly KitchenSinkFieldDef[];
}

export interface TemplateInput {
  name: string;
  description?: string;
  tags?: string[];
  fieldTypes: TemplateFieldUserType[];
  // When true, createTemplates emits the kitchen-sink YAML for this template
  // and ignores fieldTypes. Set by config/parsing when --templates > 0 and no
  // --templateFieldTypes were supplied (the default path).
  useKitchenSink?: boolean;
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
  spaces: SpaceConfig | null;
  ownerDistribution: Record<string, number> | null;
  analyticsOwners: string[] | null;
  dryRun: boolean;
  seed: string | null;
  kibanaVersion: string;
  cleanup: boolean;
  cleanupTag: string;
  // Spaces to scope --cleanup to. null = discover every space via the
  // spaces API (global cleanup). Non-null = restrict cleanup to these IDs
  // (normalized; '' represents the default space). Only consulted in
  // cleanup mode.
  cleanupSpaces: string[] | null;
  concurrency: number | null;
  // Percentage (0..100) of generated cases that should be linked to one
  // of the available templates for their owner. Ignored when no templates
  // are configured for the owner. Default is 50.
  templateUsagePercent: number;
  // When true, register a small set of legacy templates on the
  // cases-configure SO for every owner so the Cases UI shows them under
  // "Create from template". The legacy template entries are not auto-applied
  // to generated cases (the case API has no legacy-template reference field).
  // Independent of --legacyCustomFields; combine the two flags to have the
  // legacy templates pre-fill values for the typed customFields.
  legacyTemplates: boolean;
  // When true, register typed (text/toggle/number) customFields on the
  // cases-configure SO for every owner and have every generated case POST
  // matching {key, type, value} entries. Independent of --legacyTemplates.
  legacyCustomFields: boolean;
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
