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
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
  SUMMARY_ROLE_RULE,
  SYMPTOM_HYPOTHESIS_ROLE_RULE,
} from './constants';
import { detectionSchema } from './detections';

const blastRadiusDependencySchema = z.object({
  type: z.literal('dependency'),
  feature_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('The feature.id value of the Knowledge Indicator this dependency entry is based on.'),
  subtype: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      "The subtype of the Knowledge Indicator named by feature_id above, copied verbatim from that indicator's own subtype field. A point-in-time snapshot taken when this entry was written; it is never re-synced if the Knowledge Indicator is later reclassified."
    ),
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
      'The feature.id value of the Knowledge Indicator this infrastructure entry is based on.'
    ),
  subtype: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      "The subtype of the Knowledge Indicator named by feature_id above, copied verbatim from that indicator's own subtype field. A point-in-time snapshot taken when this entry was written; it is never re-synced if the Knowledge Indicator is later reclassified."
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
    .describe('The feature.id value of the Knowledge Indicator this entity entry is based on.'),
  subtype: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      "The subtype of the Knowledge Indicator named by feature_id above, copied verbatim from that indicator's own subtype field. A point-in-time snapshot taken when this entry was written; it is never re-synced if the Knowledge Indicator is later reclassified."
    ),
  name: z.string().max(MAX_TITLE_LENGTH).describe('Human-readable name of the affected entity.'),
  stream_name: z.string().max(MAX_ID_LENGTH).describe('Data stream associated with this entity.'),
});

export const blastRadiusEntrySchema = z.discriminatedUnion('type', [
  blastRadiusDependencySchema,
  blastRadiusInfrastructureSchema,
  blastRadiusEntitySchema,
]);

export type BlastRadiusEntry = z.infer<typeof blastRadiusEntrySchema>;

/**
 * A causal entity, carrying the classification of the Knowledge Indicator it references.
 *
 * `type` here is **not** the same field as `blast_radius[].type`. This one is the referenced
 * indicator's own type, drawn from `INFERRED_FEATURE_TYPES` (`entity`, `infrastructure`,
 * `technology`, `dependency`, `schema`). On a blast radius row, `type` is the discriminated-union
 * tag that selects between the three row shapes (`entity`, `infrastructure`, `dependency`) and says
 * nothing about the indicator. The two vocabularies overlap, so a value alone cannot tell you which
 * field you are holding.
 */
export const causalFeatureSchema = z.object({
  feature_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe(
      'The feature.id value of the Knowledge Indicator identified as a symptom hypothesis.'
    ),
  type: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'The type of the Knowledge Indicator named by feature_id above, copied verbatim from that indicator\'s own type field — one of "entity", "infrastructure", "technology", "dependency", or "schema". This is the Knowledge Indicator\'s own type, not the blast_radius row discriminator, which shares the name but only distinguishes the three blast radius shapes. A point-in-time snapshot taken when this entry was written; it is never re-synced if the Knowledge Indicator is later reclassified.'
    ),
  subtype: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      "The subtype of the Knowledge Indicator named by feature_id above, copied verbatim from that indicator's own subtype field. A point-in-time snapshot taken when this entry was written; it is never re-synced if the Knowledge Indicator is later reclassified."
    ),
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
export const signalEvidenceSchema = z.object({
  esql_query: z.string().max(MAX_TEXT_LENGTH).describe('The ES|QL query that verified this signal'),
  result: z
    .enum(['found', 'empty', 'error'])
    .describe(
      '"found" = query returned rows; "empty" = 0 rows returned (non-confirming); "error" = query failed to execute.'
    ),
  time_range: z
    .object({
      from: z.iso.datetime({ offset: true }).describe('Inclusive window start bound to ?_tstart.'),
      to: z.iso.datetime({ offset: true }).describe('Exclusive window end bound to ?_tend.'),
    })
    .optional()
    .describe(
      'Absolute time window the query was executed against. Required to interpret an esql_query that uses ?_tstart/?_tend placeholders.'
    ),
});

export const SIGNAL_VERDICTS = [
  'confirms',
  'refutes',
  'off_topic',
  'inconclusive',
  'not_checked',
] as const;
export type SignalVerdict = (typeof SIGNAL_VERDICTS)[number];

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
      Compact observation account for detection signals — use Found / Impact only. Max ${MAX_SIGNAL_DESCRIPTION_LENGTH} chars; shorten Found before omitting Impact on confirms.

      Found names the concrete row signature and failing target; never say only that rows were returned. Impact names what is blocked, degraded, or unaffected using outcome language only. The structured verdict carries whether this confirms, refutes, is off-topic, is inconclusive, or was not checked; do not repeat a Verdict label here.

      Do not name dependency chains, upstream causes, or topology here — use causal_features and blast_radius for that.
      ${NO_RAW_SENSITIVE_VALUES_RULE}
    `
    ),
  verdict: z
    .enum(SIGNAL_VERDICTS)
    .describe(
      'Conclusion for the authored rule hypothesis: confirms = matching failure or degradation at a newly elevated rate; refutes = verified healthy, positive, or no-failure result; off_topic = query found an observation unrelated to the rule; inconclusive = the check could not establish a conclusion (empty or errored evidence, or matching rows whose pre/post rate shows no new elevation); not_checked = no query was available.'
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

const detectionSignalMetadataSchema = detectionSchema
  .omit({
    '@timestamp': true,
    alert_index: true,
    workflow_execution_id: true,
    processed: true,
    stream_name: true,
  })
  .describe(
    'Immutable detection identity and alert metadata. Copy the complete metadata object verbatim from the matching input detection; do not reconstruct or alter its fields.'
  );

const detectionSignalSchema = signalBaseSchema
  .extend({
    type: z.literal('detection'),
    metadata: detectionSignalMetadataSchema,
  })
  .superRefine((signal, context) => {
    const result = signal.evidence?.result;
    if (signal.verdict === 'confirms' && result !== 'found') {
      context.addIssue({
        code: 'custom',
        path: ['verdict'],
        message: 'A confirming verdict requires found query evidence.',
      });
    }
    if (signal.verdict === 'off_topic' && result !== 'found') {
      context.addIssue({
        code: 'custom',
        path: ['verdict'],
        message: 'An off-topic verdict requires found query evidence.',
      });
    }
    if (signal.verdict === 'refutes' && result !== 'found' && result !== 'empty') {
      context.addIssue({
        code: 'custom',
        path: ['verdict'],
        message: 'A refuting verdict requires found or empty query evidence.',
      });
    }
    if (signal.verdict === 'inconclusive' && result === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['verdict'],
        message:
          'An inconclusive verdict requires query evidence (found rate-flat rows, empty, or error).',
      });
    }
    if (
      signal.verdict === 'not_checked' &&
      signal.evidence !== undefined &&
      signal.evidence !== null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['verdict'],
        message: 'A not-checked verdict cannot include query evidence.',
      });
    }
  });

/** Extensible discriminated union of signal sources accepted from agents. */
export const signalEntrySchema = z.discriminatedUnion('type', [detectionSignalSchema]);
export type SignalEntry = z.infer<typeof signalEntrySchema>;

/** Canonical severity values in descending severity order (critical → low). */
export const SEVERITY_OPTIONS = ['80-critical', '60-high', '40-medium', '20-low'] as const;

/**
 * Severity field contract — single source of truth for schema `.describe()` and eval judges.
 * Order of `SEVERITY_OPTIONS` is part of this contract (most-severe first).
 */
export const SEVERITY_CONTRACT_RULE = dedent`
    Sortable severity keyword. Choose the tier from confirmed grounding rows: whether the affected operation fails, degrades, or still completes on the verified path, and how broad that impact is. A concrete non-benign error in a found off-topic row directly evidences its separate observed-error event even though the source rule signal remains \`confirmed: false\`; assess that event only from the row’s error signature and impact.

    Decide in order — stop at the first match:
    1. "80-critical" when ANY of these hold:
      - a site-wide/global outage affecting all or most customers;
      - multiple current rows confirming blocked paths for distinct core operations (for example balance, history, and payment together);
      - a confirmed failure that fully blocks a mandatory service, job, or platform-critical operation end-to-end so the component can no longer perform its primary function, even when no downstream customer journey is mapped in topology — unless the block is confined to a single endpoint or lookup path affecting only that one operation, which stays at "60-high";
      - or confirmed active exposure of PII, PCI DSS, SSN, credentials, secrets, or tokens.
    2. "60-high" when grounding confirms the rule's target operation fails or is blocked on the verified path, or is broadly degraded / intermittent / partially failing for a significant subset — and no "80-critical" criterion above holds. A single endpoint or lookup path that blocks only that operation (even for every caller who reaches it) stays here.
    3. "40-medium" when grounding shows only minor confirmed degradation with limited reach, or has not confirmed whether the affected operation fails versus only slows.
    4. "20-low" for recovery, noise, false alarm, or non-issue.

    Known-ongoing exception: may cap an otherwise higher tier at "40-medium" only when current grounding confirms the exact mechanism documented as a known ongoing or transient background condition in memory, at its documented background rate. The cap does not apply to a different mechanism on the same component, nor when current rate evidence shows the documented mechanism newly elevated over that baseline — a clear rate step-up lifts the cap and the ordinary tier applies.

    Tie-break: when two adjacent tiers both match the same grounding evidence, choose the lower only when rows leave whether the operation still completes on the affected path genuinely unresolved.
  `;

/** Canonical sortable severity used by storage, APIs, and tools. */
export const severitySchema = z.enum(SEVERITY_OPTIONS).describe(SEVERITY_CONTRACT_RULE);

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
      Stable incident label. Format: "<Affected scope> — <observed condition>".
      Choose the narrowest stable affected scope that this event's assigned signals directly evidence: operation, then unique service/entity, then flow, then domain. Use flow or domain only when multiple distinct services or operations are grouped in this same event. A single-detection or single-service event must not use a customer journey, product flow, or domain label when a narrower service or operation is confirmed. Never use a generic stream name.
      The observed condition names the concrete failure, degradation, or exposure shown in grounding — a specific operation, endpoint, error class, or connection path. Do not use broad umbrellas such as "backend connection failures", "transaction flows", or "submission flows" when evidence names a narrower mechanism. Do not state lifecycle or tense (e.g. "continues", "detected", "active", "resolved").
      Preserve the title verbatim across continuation and recovery when no new detection rule UUIDs are introduced; a continuation that adds related rules may update title and symptom_hypothesis. Exclude IPs, counts, measurements, and current-cycle-only details.

      Examples: "API gateway — upstream connection refused"; "Indexer — database pool exhausted"; "Platform tier — connection refused across worker, scheduler, and API services" (multi-service cascade grouped in one event).
    `
    ),
  // hypothesis of the observed failure. helps agents to understand and group signals that share the same symptom class.
  symptom_hypothesis: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe(
      dedent`
        Provisional, evidence-grounded technical mechanism for this incident. Max ${MAX_SYMPTOM_HYPOTHESIS_LENGTH} chars.
        In one sentence, name the deepest supported failing component or dependency, its concrete failure signature or mechanism, and how it propagates to the affected operation.

        ${SYMPTOM_HYPOTHESIS_ROLE_RULE}
        Do not restate the title or summary. Do not use generic terms such as "backend unavailability" or "dependency failure" when the evidence identifies a component, resource, endpoint, protocol, or error signature.
        ${NO_RAW_SENSITIVE_VALUES_RULE}
        `
    ),
  summary: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .describe(
      dedent`
        Objective, self-contained account of the observed state and potential impact. Max ${MAX_SUMMARY_LENGTH} chars.
        Lead with the normalized observed error signature — including the error type or code, operation, protocol, endpoint, port, and relevant non-sensitive address — and the affected component or dependency path, then state whether impact is confirmed, possible, or not established. When no failure signature is observed, lead with the concise observed success, health, or off-topic signature instead. Include onset, magnitude, and current or recovery state only when known.

        ${SUMMARY_ROLE_RULE}
        Use matched query KI descriptions or resolved feature metadata to name the observed component or dependency path when it clarifies the failure for an operator. Possible impact may come from the same context, but must be conditional and scoped.

        Do not repeat the title or symptom_hypothesis narrative. Preserve decisive technical details from the canonical error signature when they identify the observed state. Evidence limitations may qualify the conclusion, but do not narrate queries, detections, or analysis steps. Do not include actions, urgency language, detection artifacts (p_value or severity_score), memory-page presence, or unsupported impact claims.
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
      'symptom_hypothesis correctness 0.0–1.0 float. Higher values reflect stronger evidence grounding and more corroboration. ' +
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
      'ID of the workflow execution that produced this specific version, e.g. the triage run that wrote it or the investigation run that changed its severity; omit when the write did not originate from a workflow execution.'
    ),
  conversation_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('ID of the agent chat conversation this write originated from.'),
});
