/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import { MAX_ID_LENGTH, MAX_TITLE_LENGTH, MAX_TEXT_LENGTH } from './constants';
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
    .max(100)
    .optional()
    .describe(
      'Communication protocol used between source and target (e.g. "HTTP", "gRPC", "TCP").'
    ),
  stream_name: z
    .string()
    .max(MAX_STREAM_NAME_LENGTH)
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
    .max(100)
    .optional()
    .describe('Workload names (pods, services) that make up this infrastructure component.'),
  stream_name: z
    .string()
    .max(MAX_STREAM_NAME_LENGTH)
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
    .describe('Identifier of the Knowledge Indicator feature identified as a root cause.'),
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
  row_count: z
    .number()
    .optional()
    .describe('Number of rows the query returned. 0 means no matching data — non-confirming.'),
});

const signalBaseSchema = z.object({
  stream_name: z
    .string()
    .max(MAX_STREAM_NAME_LENGTH)
    .describe('Data stream this signal was collected from.'),
  description: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      'Human-readable account of what was observed and what it means. ' +
        'For detection signals, use this structure: ' +
        '"Testing: [hypothesis]. Expected if true: [pattern]. ' +
        'Found: [N rows — include the failing upstream target/endpoint read from the row, e.g. service name, host:port, or DNS name]. ' +
        'Why: [bounded observable cause, ≤1–2 steps from the found-row — name the failing upstream and the observed failure mode; ' +
        'stop at the lowest actionable cause the row supports]. ' +
        'Verdict: confirms | refutes | inconclusive — state who or what is blocked." ' +
        'No raw IDs, UUIDs, or metric values.'
    ),
  confirmed: z
    .boolean()
    .optional()
    .describe(
      'Whether this signal actively confirms the failure hypothesis. ' +
        'Omit when the signal is unverified or non-confirming — never set to false.'
    )
    .default(false),
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

export const significantEventBaseSchema = z.object({
  event_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'Stable incident key shared across all documents that belong to the same event. ' +
        'Auto-generated when creating a new event. ' +
        'Must be preserved unchanged across all subsequent writes for the same incident.'
    ),
  title: z
    .string()
    .describe(
      'Stable incident identifier. Format: "<Service> — <component>: <symptom>". ' +
        'Component = affected subsystem (e.g. "write API"); symptom = failure mode (e.g. "connection refused"). ' +
        'Must be specific enough that no two different incidents could share it. ' +
        'No IPs, counts, or measurements.'
    )
    .max(MAX_TITLE_LENGTH),
  summary: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      'Self-contained incident brief. Four elements in order: ' +
        '(1) service + operator-visible symptom — what the user experiences; ' +
        '(2) who is affected and blast radius — name the exposed path when blast_radius has dependency entries; ' +
        '(3) magnitude + recovery — error rate/count, onset time, recovering or stable; ' +
        '(4) most time-sensitive on-call action. ' +
        'Format: "{Service}: {symptom}. {Who/blast radius}. {Magnitude, onset, recovery}. {Most urgent action}."'
    ),
  // 4-level enum aligned with Elastic Incident Management; replaces `criticality` (0–100 int)
  severity: z
    .enum(['critical', 'high', 'medium', 'low'])
    .describe(
      '"critical" = core user journey broken or PII/credentials confirmed in logs — page immediately; ' +
        '"high" = significant feature unavailable, confirmed user impact — respond within the hour; also use when signal quality is unclear but cannot be dismissed; ' +
        '"medium" = partial degradation, stable workarounds, or impact not yet confirmed — schedule a fix; ' +
        '"low" = low-impact, noise, confirmed false alarm, or confirmed recovery — stays open for user review when corroborated (confidence ≥ 0.5); pair with status "dismissed" when evidence is too thin to trust.'
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Root-cause correctness 0.0–1.0 float. ' +
        'Higher values reflect stronger evidence grounding and more corroboration. ' +
        'causal_features ceiling: cap at 0.65 when causal_features is empty (applies to open status only).'
    ),
  stream_names: z.array(z.string().max(MAX_STREAM_NAME_LENGTH)).max(100),

  // entities that are considered to be the root cause of the incident
  causal_features: z
    .array(causalFeatureSchema)
    .optional()
    .describe(
      'Knowledge Indicator features identified as root causes of this incident. ' +
        'These are the entities the SRE must act on to stop the incident. ' +
        'Empty when no causal entities were identified.'
    ),
  // downstream scope of the incident
  blast_radius: z
    .array(blastRadiusEntrySchema)
    .optional()
    .describe(
      'Scope of downstream impact beyond the origin service. ' +
        'A discriminated union covering affected dependency edges (type "dependency"), infrastructure components (type "infrastructure"), and other affected entities (type "entity").'
    ),
  // extensible signal union
  signals: z
    .array(signalEntrySchema)
    .optional()
    .describe(
      'Evidence signals associated with this incident record. ' +
        'Each entry represents one alerting rule associated with this event. ' +
        'Currently only type "detection" is supported; additional types are reserved for future use.'
    ),
  // traceability
  workflow_execution_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'ID of the workflow execution that produced this write; omit when ' +
        'the write did not originate from a workflow execution.'
    ),
  conversation_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('ID of the agent chat conversation this write originated from.'),
});

export type SigEventBase = z.infer<typeof significantEventBaseSchema>;
