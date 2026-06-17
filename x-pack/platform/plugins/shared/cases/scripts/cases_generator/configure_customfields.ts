/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AUTO_GENERATED_TAG, pick, rng } from './utils';

// The cases plugin's typed customFields support exactly three primitive
// types — see common/types/domain/custom_field/v1.ts (CustomFieldTypes).
// Mirrored here as a literal-string union so this script doesn't depend on
// io-ts at runtime.
export type LegacyCustomFieldType = 'text' | 'toggle' | 'number';

// One entry registered on the cases-configure saved object's `customFields`
// array per owner when --legacyCustomFields is set. Mirrors
// CustomFieldConfigurationRt from common/types/domain/configure/v1.ts.
export interface LegacyCustomFieldConfig {
  key: string;
  label: string;
  type: LegacyCustomFieldType;
  required: boolean;
  defaultValue?: string | number | boolean | null;
}

// Value the script attaches to a generated case for one configured customField.
// Shape matches CaseCustomFieldRt from common/types/domain/custom_field/v1.ts.
export interface LegacyCaseCustomFieldValue {
  key: string;
  type: LegacyCustomFieldType;
  value: string | number | boolean | null;
}

// Source-of-truth registration list for --legacyCustomFields. Edit here to
// change which fields the script registers on every owner's configure SO.
// Keys are stable so cleanup can identify and remove them on reruns.
export const LEGACY_CUSTOM_FIELDS_CONFIG: readonly LegacyCustomFieldConfig[] = [
  // text — required, with default + optional, no default
  {
    key: 'incident_summary',
    label: 'Incident summary',
    type: 'text',
    required: true,
    defaultValue: 'Auto-generated summary',
  },
  {
    key: 'follow_up_actions',
    label: 'Follow-up actions',
    type: 'text',
    required: false,
  },
  // toggle — required with default + optional no default
  {
    key: 'requires_postmortem',
    label: 'Requires postmortem',
    type: 'toggle',
    required: true,
    defaultValue: false,
  },
  {
    key: 'customer_impact_confirmed',
    label: 'Customer impact confirmed',
    type: 'toggle',
    required: false,
  },
  // number — required with default + optional no default
  {
    key: 'sla_minutes',
    label: 'SLA (minutes)',
    type: 'number',
    required: true,
    defaultValue: 60,
  },
  {
    key: 'affected_user_count',
    label: 'Affected user count',
    type: 'number',
    required: false,
  },
];

// Stable lookup of customField keys we own. Used by cleanup to filter the
// configure SO's customFields array down to only the entries this script
// installed (so manually-added customFields stay intact).
export const LEGACY_CUSTOM_FIELD_KEYS: readonly string[] = LEGACY_CUSTOM_FIELDS_CONFIG.map(
  (entry) => entry.key
);

const SAMPLE_INCIDENT_SUMMARIES = [
  'Customer reports degraded checkout latency',
  'Suspicious login attempts from new geographies',
  'Background job backlog growing past threshold',
  'API error rate breached SLO during deploy',
  'Data integrity warning emitted by reconciliation job',
];

const SAMPLE_FOLLOW_UP_ACTIONS = [
  'Open incident channel and page on-call',
  'Roll back deployment and capture diagnostics',
  'Increase capacity and monitor SLO budget',
  'Coordinate with security on credential rotation',
  'Schedule blameless postmortem within 48h',
];

// Builds a sampled value for one registered customField, biased towards the
// declared default but mixing in alternative values so the demo dataset shows
// variety. Used by buildLegacyCustomFieldValuesForCase.
function sampleValueForField(field: LegacyCustomFieldConfig): LegacyCaseCustomFieldValue['value'] {
  switch (field.type) {
    case 'text': {
      if (field.key === 'incident_summary') return pick([...SAMPLE_INCIDENT_SUMMARIES]);
      if (field.key === 'follow_up_actions') return pick([...SAMPLE_FOLLOW_UP_ACTIONS]);
      if (typeof field.defaultValue === 'string') return field.defaultValue;
      return 'Auto-generated value';
    }
    case 'toggle': {
      if (field.key === 'requires_postmortem') return rng() < 0.3;
      if (field.key === 'customer_impact_confirmed') return rng() < 0.5;
      if (typeof field.defaultValue === 'boolean') return field.defaultValue;
      return rng() < 0.5;
    }
    case 'number': {
      if (field.key === 'sla_minutes') return pick([15, 30, 60, 120, 240]);
      if (field.key === 'affected_user_count') return Math.floor(rng() * 5_000);
      if (typeof field.defaultValue === 'number') return field.defaultValue;
      return Math.floor(rng() * 100);
    }
  }
}

// Returns one {key, type, value} entry per registered customField for a
// generated case. Called per case by run.ts when --legacyCustomFields is set
// so every case carries values for every configured customField. Sampling
// uses the seeded RNG so output is reproducible under --seed.
export function buildLegacyCustomFieldValuesForCase(): LegacyCaseCustomFieldValue[] {
  return LEGACY_CUSTOM_FIELDS_CONFIG.map((field) => ({
    key: field.key,
    type: field.type,
    value: sampleValueForField(field),
  }));
}

// Returns a deterministic value (always the configured default, falling back
// to a stable sample) for use inside a legacy template's caseFields.customFields
// list — a template's stored values are static, not randomized per render.
function staticValueForField(field: LegacyCustomFieldConfig): LegacyCaseCustomFieldValue['value'] {
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    return field.defaultValue;
  }
  switch (field.type) {
    case 'text':
      return field.key === 'follow_up_actions'
        ? SAMPLE_FOLLOW_UP_ACTIONS[0]
        : 'Auto-generated value';
    case 'toggle':
      return false;
    case 'number':
      return 0;
  }
}

// One entry registered on the cases-configure SO's `templates` array per
// owner when --legacyTemplates is set. Mirrors TemplateConfigurationRt from
// common/types/domain/configure/v1.ts. caseFields is the partial case body
// the UI pre-fills when the user clicks "Create from template" — including
// typed customFields when the script also has --legacyCustomFields enabled.
export interface LegacyTemplateConfig {
  key: string;
  name: string;
  description?: string;
  tags: string[];
  caseFields: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string | null;
    tags: string[];
    customFields: LegacyCaseCustomFieldValue[];
  };
}

interface LegacyTemplateSeed {
  key: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string | null;
  caseTags: string[];
  // Override map for specific fields; other fields fall back to staticValueForField.
  customFieldOverrides?: Partial<Record<string, LegacyCaseCustomFieldValue['value']>>;
}

const LEGACY_TEMPLATE_SEEDS: readonly LegacyTemplateSeed[] = [
  {
    key: 'legacy-incident-low',
    name: 'Legacy: Low-priority incident',
    description: 'Pre-fills a low-severity incident — useful for triage drills.',
    severity: 'low',
    category: 'Network',
    caseTags: ['legacy', 'low-priority'],
    customFieldOverrides: {
      requires_postmortem: false,
      sla_minutes: 240,
    },
  },
  {
    key: 'legacy-incident-high',
    name: 'Legacy: High-priority incident',
    description: 'Pre-fills a high-severity incident with tighter SLAs.',
    severity: 'high',
    category: 'Application',
    caseTags: ['legacy', 'high-priority'],
    customFieldOverrides: {
      requires_postmortem: true,
      sla_minutes: 30,
      customer_impact_confirmed: true,
    },
  },
  {
    key: 'legacy-incident-postmortem',
    name: 'Legacy: Critical incident requiring postmortem',
    description: 'Pre-fills a critical incident with all customFields set.',
    severity: 'critical',
    category: 'Identity',
    caseTags: ['legacy', 'postmortem', 'critical'],
    customFieldOverrides: {
      requires_postmortem: true,
      sla_minutes: 15,
      customer_impact_confirmed: true,
      affected_user_count: 1_000,
    },
  },
];

// Builds the configure-SO templates payload, with one legacy template per
// seed. When `includeCustomFieldValues` is false, caseFields.customFields is
// emitted empty (used when --legacyTemplates is on without
// --legacyCustomFields, so the templates don't reference unregistered keys).
// Called by run.ts before sending the configure-SO request.
export function buildLegacyTemplates(includeCustomFieldValues: boolean): LegacyTemplateConfig[] {
  return LEGACY_TEMPLATE_SEEDS.map((seed) => ({
    key: seed.key,
    name: seed.name,
    description: seed.description,
    tags: [AUTO_GENERATED_TAG, 'legacy'],
    caseFields: {
      severity: seed.severity,
      category: seed.category,
      tags: seed.caseTags,
      customFields: includeCustomFieldValues
        ? LEGACY_CUSTOM_FIELDS_CONFIG.map((field) => ({
            key: field.key,
            type: field.type,
            value: seed.customFieldOverrides?.[field.key] ?? staticValueForField(field),
          }))
        : [],
    },
  }));
}

// Stable lookup of legacy template keys this script installs. Used by
// cleanup to filter the configure SO's `templates` array down to entries
// the script owns.
export const LEGACY_TEMPLATE_KEYS: readonly string[] = LEGACY_TEMPLATE_SEEDS.map(
  (seed) => seed.key
);
