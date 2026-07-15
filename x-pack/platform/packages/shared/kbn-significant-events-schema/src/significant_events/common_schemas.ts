/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_ID_LENGTH,
  MAX_RULE_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
} from './constants';

export const dependencyEdgeSchema = z.object({
  source: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .describe('Source service or component in the dependency relationship.'),
  target: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .describe('Target service or component being called or depended upon.'),
  protocol: z
    .string()
    .max(100)
    .optional()
    .describe('Communication protocol (e.g. "HTTP", "gRPC", "TCP").'),
  exposure: z
    .string()
    .max(100)
    .optional()
    .describe(
      'Exposure level: "exposed" means this edge is visible to end users; "internal" means backend-only.'
    ),
});

export const infraComponentSchema = z.object({
  title: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .optional()
    .describe(
      'Human-readable name of the infrastructure component (e.g. "Auth Service", "Database Cluster").'
    ),
  workloads: z
    .array(z.string().max(MAX_ID_LENGTH))
    .max(100)
    .optional()
    .describe(
      'List of workload names (e.g. pod names, service names) that make up this component.'
    ),
  exposure: z
    .string()
    .max(100)
    .optional()
    .describe('Exposure level: "exposed" means end-user-facing; "internal" means backend-only.'),
});

export const causeKiSchema = z.object({
  name: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .optional()
    .describe('Human-readable name of the Knowledge Indicator (KI) identified as a causal factor.'),
  stream_name: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('Data stream associated with this causal KI.'),
});

export const evidenceSchema = z.object({
  rule_name: z
    .string()
    .max(MAX_RULE_NAME_LENGTH)
    .optional()
    .describe('Name of the alerting rule that produced this evidence.'),
  rule_uuid: z.string().max(MAX_ID_LENGTH).optional().describe('UUID of the alerting rule.'),
  result: z
    .string()
    .max(MAX_RULE_NAME_LENGTH)
    .optional()
    .describe(
      'Outcome of the query: "found" = rows returned; "empty" = 0 rows; "error" = query failed.'
    ),
  description: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe(
      'Documents a hypothesis test, not just an observation. ' +
        'Format: "Testing: [what hypothesis this query tests]. Expected if true: [what rows would look like]. Found: [count, pattern, or \'no matching rows\']. Verdict: [confirms / refutes / inconclusive — and why]." ' +
        'No payload values — no UUIDs, raw log content, or specific metric values.'
    ),
  stream_name: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('Data stream this evidence was collected from.'),
  row_count: z
    .number()
    .optional()
    .describe(
      'Number of rows matching the failure pattern. 0 means no matching data — treat as non-confirming.'
    ),
  collected_at: z.iso
    .datetime()
    .optional()
    .describe('ISO timestamp when this evidence was collected.'),
  esql_query: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .nullable()
    .optional()
    .describe('The ES|QL query used to collect this evidence.'),
  confirmed: z
    .boolean()
    .optional()
    .describe(
      'true = this entry actively confirms the failure hypothesis. ' +
        'Omit the field entirely for unverified or non-confirming entries — never set to false.'
    ),
});

export const sigEventBaseSchema = z.object({
  discovery_slug: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'Stable episode identifier shared across all versions of the same incident. ' +
        'Omit for new episodes — auto-generated from the primary stream and rule names. ' +
        'Pass verbatim for continuation writes (reuse the value returned by a prior discovery_write or from event_search results).'
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
  root_cause: z
    .string()
    .describe(
      'Lowest actionable cause. ' +
        'Sentence frame: "[Service] is [failing/timing out/erroring] because [mechanism] is [exhausted/unreachable/misconfigured/returning X]." ' +
        'The "because" clause must name a mechanism an SRE can act on immediately — a claim without it is a symptom, not a cause. ' +
        'Omit when confidence < 0.5.'
    )
    .max(MAX_TEXT_LENGTH)
    .optional(),
  summary: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      'Self-contained incident brief. Four elements in order: ' +
        '(1) service + operator-visible symptom — what the user experiences; ' +
        '(2) who is affected and blast radius — name the exposed path when dependency_edges has exposure:"exposed" entries; ' +
        '(3) magnitude + recovery — error rate/count, onset time, recovering or stable; ' +
        '(4) most time-sensitive on-call action. ' +
        'Format: "{Service}: {symptom}. {Who/blast radius}. {Magnitude, onset, recovery}. {Most urgent action}."'
    ),
  criticality: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      'User-experience impact 0–100 integer. ' +
        'Tiers: 76–100 = SEV1 (core journey broken or PII/credentials confirmed in logs — page immediately); ' +
        '51–75 = SEV2 (significant feature unavailable, no workaround — respond within the hour); ' +
        '31–50 = SEV3 (partial degradation, stable workarounds — schedule a fix); ' +
        '0–30 = SEV4/5 (low-impact, noise, or confirmed false alarm — demote or monitor). ' +
        'When uncertain between tiers, choose the lower one.'
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Root-cause correctness 0.0–1.0 float. ' +
        'Higher values reflect stronger evidence grounding and more corroboration. ' +
        'cause_kis ceiling: cap at 0.65 when cause_kis is empty (applies to promoted/acknowledged only — not demoted/resolved).'
    ),
  stream_names: z.array(z.string().max(MAX_ID_LENGTH)).max(100),
  rule_names: z.array(z.string().max(MAX_RULE_NAME_LENGTH)).max(100).optional(),
  workflow_execution_id: z.string().max(MAX_ID_LENGTH).optional(),
  conversation_id: z.string().max(MAX_ID_LENGTH).optional(),
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema).optional(),
  evidences: z.array(evidenceSchema).optional(),
});

export type SigEventBase = z.infer<typeof sigEventBaseSchema>;
