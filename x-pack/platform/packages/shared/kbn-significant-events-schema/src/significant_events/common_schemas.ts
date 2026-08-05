/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import dedent from 'dedent';
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_TEXT_LENGTH,
  NO_RAW_SENSITIVE_VALUES_RULE,
  MAX_ARRAY_LENGTH,
} from './constants';
import { detectionSchema } from './detections';

const blastRadiusDependencySchema = z.object({
  type: z.literal('dependency'),
  feature_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Identifier of the Knowledge Indicator feature this dependency entry is based on.'),
  source: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .describe(
      'Name of the service or component initiating the call in this dependency relationship.'
    ),
  target: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .describe('Name of the service or component being called or depended upon.'),
  protocol: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'Communication protocol used between source and target (e.g. "HTTP", "gRPC", "TCP").'
    ),
  stream_name: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Data stream associated with this dependency.'),
});

const blastRadiusInfrastructureSchema = z.object({
  type: z.literal('infrastructure'),
  feature_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'Identifier of the Knowledge Indicator feature this infrastructure entry is based on.'
    ),
  title: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .optional()
    .describe(
      'Human-readable name of the infrastructure component (e.g. "Database Cluster", "Auth Service").'
    ),
  workloads: z
    .array(z.string().max(MAX_ID_LENGTH))
    .max(MAX_ARRAY_LENGTH)
    .optional()
    .describe('Workload names (pods, services) that make up this infrastructure component.'),
  stream_name: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Data stream associated with this infrastructure component.'),
});

const blastRadiusEntitySchema = z.object({
  type: z.literal('entity'),
  feature_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Identifier of the Knowledge Indicator feature this entity entry is based on.'),
  name: z.string().max(MAX_TITLE_LENGTH).describe('Human-readable name of the affected entity.'),
  stream_name: z.string().max(MAX_ID_LENGTH).describe('Data stream associated with this entity.'),
});

export const blastRadiusEntrySchema = z.discriminatedUnion('type', [
  blastRadiusDependencySchema,
  blastRadiusInfrastructureSchema,
  blastRadiusEntitySchema,
]);

export type BlastRadiusEntry = z.infer<typeof blastRadiusEntrySchema>;

export const causalFeatureSchema = z.object({
  feature_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Identifier of the Knowledge Indicator feature identified as a symptom hypothesis.'),
  name: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .describe(
      'Human-readable name of the causal entity (e.g. service or component name). Not a UUID.'
    ),
  stream_name: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('Data stream associated with this causal feature.'),
});
export type CausalFeature = z.infer<typeof causalFeatureSchema>;

/** Query-based verification attached to a signal when the agent ran an ES|QL check. */
const signalEvidenceSchema = z.object({
  esql_query: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe('The ES|QL query executed to verify this signal.'),
  result: z
    .enum(['found', 'empty', 'error'])
    .describe(
      '"found" = query returned rows; "empty" = 0 rows returned (non-confirming); "error" = query failed to execute.'
    ),
});

const signalBaseSchema = z.object({
  stream_name: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Data stream this signal was collected from.'),
  description: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      dedent`
        Human-readable account of what was observed and what it means. Required format for detection signals — do not use alternative shapes: 
        
        "Testing: [hypothesis]. Expected if true: [pattern]. Found: [N rows — failing upstream target/endpoint from the row, e.g. service, host:port, or DNS name]. Why: [causal link visible in the row — name the failing upstream and how it is failing, e.g. "api-service cannot reach db-primary:5432 — connection refused"; do not infer beyond what the row shows]. Verdict: confirms | refutes | inconclusive — who/what is blocked."
        ${NO_RAW_SENSITIVE_VALUES_RULE}
      `
    ),
  confirmed: z
    .boolean()
    .optional()
    .describe(
      'Whether this signal actively confirms the failure hypothesis. Omit when the signal is unverified or non-confirming — never set to false.'
    ),
  collected_at: z.iso
    .datetime({ offset: true })
    .optional()
    .describe('ISO timestamp when this signal was collected.'),
  evidence: signalEvidenceSchema
    .nullable()
    .optional()
    .describe(
      'ES|QL query verification for this signal. Present when a query was executed to confirm or refute the signal; null when no verification was run.'
    ),
});

const detectionSignalSchema = signalBaseSchema.extend({
  type: z.literal('detection'),
  metadata: detectionSchema.omit({
    '@timestamp': true,
    alert_index: true,
    workflow_execution_id: true,
    processed: true,
    stream_name: true,
  }),
});

/** Extensible discriminated union of signal sources. Only `detection` is implemented for now. */
export const signalEntrySchema = z.discriminatedUnion('type', [detectionSignalSchema]);
export type SignalEntry = z.infer<typeof signalEntrySchema>;

/** Canonical severity values in descending severity order (critical → low). */
export const SEVERITY_OPTIONS = ['80-critical', '60-high', '40-medium', '20-low'] as const;

/** Canonical sortable severity used by storage, APIs, and tools. */
export const severitySchema = z.enum(SEVERITY_OPTIONS).describe(dedent`
    Sortable severity keyword. Higher prefixes indicate greater severity:
    "80-critical" = the most severe outage. Any ONE qualifies independently:
      - a site-wide/global outage affecting most customers;
      - a user journey completely and unavoidably blocked for every customer who reaches that step;
      - or confirmed severe PII, credential, or secret exposure.
    "60-high" = major, painful customer impact, such as a significant feature or journey being unavailable, but limited below critical scope.
    "40-medium" = partial or less widespread degradation, or customer impact is not yet confirmed.
    "20-low" = minor customer impact, recovery, noise, false alarm, or non-issue.

    Assess affected population, journey availability, duration, and spread. When uncertain between tiers, choose the lower one.
  `);

export type Severity = z.infer<typeof severitySchema>;

const SEVERITY_LABELS: Record<Severity, string> = {
  '20-low': i18n.translate('xpack.significantEvents.severity.lowLabel', {
    defaultMessage: 'Low',
  }),
  '40-medium': i18n.translate('xpack.significantEvents.severity.mediumLabel', {
    defaultMessage: 'Medium',
  }),
  '60-high': i18n.translate('xpack.significantEvents.severity.highLabel', {
    defaultMessage: 'High',
  }),
  '80-critical': i18n.translate('xpack.significantEvents.severity.criticalLabel', {
    defaultMessage: 'Critical',
  }),
};

/** Convert canonical sortable severity to its human-readable label. */
export const getSeverityLabel = (severity: Severity): string => SEVERITY_LABELS[severity];

export const significantEventBaseSchema = z.object({
  event_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'Stable incident key shared across all documents that belong to the same event. Auto-generated when creating a new event. Must be preserved unchanged across all subsequent writes for the same incident.'
    ),
  title: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .describe(
      dedent`
      Stable incident label. Format: "<Affected flow or service> — <failure domain>".
      Preserve it verbatim across continuation and recovery. Exclude IPs, counts, measurements, current-cycle details, and state or tense words (e.g. "continues", "detected", "active", "resolved").'
      
      Example: "Auth service — login endpoint connection refused".
    `
    ),
  // hypothesis of the observed failure. helps agents to understand and group signals that share the same symptom class.
  symptom_hypothesis: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe(
      dedent`
        Provisional, evidence-grounded explanation of the observed signals. In one sentence, name the affected flow or entity, observed symptom, and best-supported mechanism. 

        ${NO_RAW_SENSITIVE_VALUES_RULE}
        `
    ),
  summary: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      dedent`
        Objective, self-contained account of the observed state and potential impact. Include:
          (1) the evidence-backed failure; 
          (2) the affected flow and potential impact supported by signals or blast_radius;
          (3) magnitude, onset, and current or recovery state when known.
          
        Do not include actions, urgency language, or unsupported impact claims.
        ${NO_RAW_SENSITIVE_VALUES_RULE}
      `
    ),
  // 4-level enum aligned with Elastic Incident Management;
  severity: severitySchema,
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Symptom-hypothesis correctness 0.0–1.0 float. Higher values reflect stronger evidence grounding and more corroboration. ' +
        'causal_features ceiling: cap at 0.65 when causal_features is empty (applies to open status only).'
    ),
  stream_names: z
    .array(z.string().max(MAX_ID_LENGTH))
    .max(MAX_ARRAY_LENGTH)
    .describe('Data streams associated with this event.'),

  // entities that may contribute to the incident
  causal_features: z
    .array(causalFeatureSchema)
    .optional()
    .describe(
      'Knowledge Indicator features identified as candidate causal entities. They provide topology context but do not establish a root cause without aligned signal evidence. ' +
        'Empty when no causal entities were identified.'
    ),
  // downstream scope of the incident
  blast_radius: z
    .array(blastRadiusEntrySchema)
    .max(MAX_ARRAY_LENGTH)
    .optional()
    .describe(
      'Scope of downstream impact beyond the origin service. A discriminated union covering affected dependency edges (type "dependency"), infrastructure components (type "infrastructure"), and other affected entities (type "entity").'
    ),
  // extensible signal union
  signals: z
    .array(signalEntrySchema)
    .max(MAX_ARRAY_LENGTH)
    .optional()
    .describe(
      'Evidence signals associated with this incident record. Each entry represents one alerting rule associated with this event. '
    ),
  // traceability
  workflow_execution_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'ID of the workflow execution that produced this write; omit when the write did not originate from a workflow execution.'
    ),
  conversation_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('ID of the agent chat conversation this write originated from.'),
});

export type SigEventBase = z.infer<typeof significantEventBaseSchema>;
