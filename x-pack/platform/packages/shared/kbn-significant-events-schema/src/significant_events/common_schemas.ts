/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { alertEventSeveritySchema } from '@kbn/alerting-v2-schemas';
import type { AlertEventSeverity } from '@kbn/alerting-v2-schemas';
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

const blastRadiusDependencySchema = lazySchema(() =>
  z.object({
    type: z.literal('dependency'),
    feature_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .describe(
        'The feature.id value of the Knowledge Indicator this dependency entry is based on.'
      ),
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
  })
);

const blastRadiusInfrastructureSchema = lazySchema(() =>
  z.object({
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
  })
);

const blastRadiusEntitySchema = lazySchema(() =>
  z.object({
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
  })
);

export const blastRadiusEntrySchema = lazySchema(() =>
  z.discriminatedUnion('type', [
    blastRadiusDependencySchema,
    blastRadiusInfrastructureSchema,
    blastRadiusEntitySchema,
  ])
);

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
export const causalFeatureSchema = lazySchema(() =>
  z.object({
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
  })
);
export type CausalFeature = z.infer<typeof causalFeatureSchema>;

/** Query-based verification attached to a signal when the agent ran an ES|QL check. */
export const signalEvidenceSchema = lazySchema(() =>
  z.object({
    esql_query: z
      .string()
      .max(MAX_TEXT_LENGTH)
      .describe('The ES|QL query that verified this signal'),
    result: z
      .enum(['found', 'empty', 'error'])
      .describe(
        '"found" = query returned rows; "empty" = 0 rows returned (non-confirming); "error" = query failed to execute.'
      ),
    time_range: z
      .object({
        from: z.iso
          .datetime({ offset: true })
          .describe('Inclusive window start bound to ?_tstart.'),
        to: z.iso.datetime({ offset: true }).describe('Exclusive window end bound to ?_tend.'),
      })
      .optional()
      .describe(
        'Absolute time window the query was executed against. Required to interpret an esql_query that uses ?_tstart/?_tend placeholders.'
      ),
  })
);

export const SIGNAL_VERDICTS = [
  'confirms',
  'refutes',
  'off_topic',
  'inconclusive',
  'not_checked',
] as const;
export type SignalVerdict = (typeof SIGNAL_VERDICTS)[number];

export const SIGNAL_EFFECTS = ['none', 'degradation', 'outage', 'exposure'] as const;
export type SignalEffect = (typeof SIGNAL_EFFECTS)[number];

/**
 * Effect field contract — single source of truth for schema `.describe()` and eval judges.
 * This contract only governs what the agent classifies from grounding evidence, not what tier that
 * classification implies. There is no "scope" on a blocked operation: escalates a
 * single blocked operation to critical on KI `severity_score` or topology fan-out, not on a
 * judgment about how narrowly the block is confined.
 */
export const EFFECT_CONTRACT_RULE = dedent`
    What this signal's \`evidence\` shows about whether the operation succeeded — never from
    \`p_value\`, \`change_point_type\`, fire count, or this signal's own \`description\` wording.

    - "none": the operation completed normally, or no confirmed impact is shown.
    - "degradation": the operation succeeded but impaired — elevated latency, a retry that then
      succeeded, a fallback response, or a partial result.
    - "outage": the operation failed to complete — an error status (including a rejected or
      bad-request reply), an exception, a timeout, or a refused connection. A reply reporting
      failure is still a failure — whose fault does not change that; attribution belongs in
      \`symptom_hypothesis\`, not here. Name each distinct failing path in \`outage_paths\` — this
      describes only the requests this evidence covers, not every caller or region.
    - "exposure": confirmed active exposure of PII, PCI DSS, SSN, credentials, secrets, or tokens.

    An internal dependency's error is not itself the operation failing when the system is known to
    tolerate it via a fallback, backup path, or degraded mode — judge the operation's own outcome,
    not the dependency's. When a row genuinely doesn't show that outcome either way, the matched
    query KI's description may break the tie if this signal's own description cites the specific
    clause the row supports; otherwise default to "degradation".

    Only \`confirms\`, or \`off_topic\` with a concrete non-benign error, may be anything but
    "none".
  `;

const signalBaseSchema = lazySchema(() =>
  z.object({
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
    effect: z.enum(SIGNAL_EFFECTS).optional().describe(EFFECT_CONTRACT_RULE),
    outage_paths: z
      .array(z.string().max(MAX_TITLE_LENGTH))
      .max(MAX_ARRAY_LENGTH)
      .optional()
      .describe(
        'Required when effect is "outage": each distinct verified path the row shows failing to complete, named by what traverses it — the caller operation when the evidence names one ("checkout"), otherwise the failing hop ("orders-api -> postgres"). One entry per distinct path; a URL alone is not a path. Omit when effect is not "outage".'
      ),
  })
);

const detectionSignalMetadataSchema = lazySchema(() =>
  detectionSchema
    .omit({
      '@timestamp': true,
      alert_index: true,
      workflow_execution_id: true,
      processed: true,
      stream_name: true,
    })
    .describe(
      'Immutable detection identity and alert metadata. Copy the complete metadata object verbatim from the matching input detection; do not reconstruct or alter its fields.'
    )
);

const detectionSignalSchema = lazySchema(() =>
  signalBaseSchema
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
      // Deterministic guard: only a verdict that means "this row shows something real" may claim
      // impact. An off-topic signal here means a concrete non-benign observed error (guarded above:
      // off_topic requires found evidence) — not merely an unrelated finding.
      if (signal.verdict === 'confirms' && signal.effect === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['effect'],
          message:
            'A confirms signal requires an explicit effect. An omitted effect is computed as "none" and would tier the event as low.',
        });
      }
      const canClaimImpact = signal.verdict === 'confirms' || signal.verdict === 'off_topic';
      if (!canClaimImpact && signal.effect !== undefined && signal.effect !== 'none') {
        context.addIssue({
          code: 'custom',
          path: ['effect'],
          message:
            'effect can only be "degradation", "outage", or "exposure" on a confirms signal, or an off_topic signal with a concrete observed error. Every other verdict must use effect "none" or omit it.',
        });
      }
      if (signal.effect === 'outage' && (signal.outage_paths ?? []).length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['outage_paths'],
          message: 'effect "outage" requires at least one entry in outage_paths.',
        });
      }
      if (signal.effect !== 'outage' && (signal.outage_paths ?? []).length > 0) {
        context.addIssue({
          code: 'custom',
          path: ['outage_paths'],
          message: 'outage_paths is only valid when effect is "outage".',
        });
      }
    })
);

/** Extensible discriminated union of signal sources accepted from agents. */
export const signalEntrySchema = lazySchema(() =>
  z.discriminatedUnion('type', [detectionSignalSchema])
);
export type SignalEntry = z.infer<typeof signalEntrySchema>;

/** Canonical severity values in descending severity order (critical → low). info is not supported yet */
export const SEVERITY_OPTIONS = [
  'critical',
  'high',
  'medium',
  'low',
] as const satisfies readonly AlertEventSeverity[];

export const SEVERITY_CONTRACT_RULE =
  "Computed severity tier, derived from each signal's effect and outage_paths, the KI severity_score, and the event's stored topology. Never written or inferred by agents.";
/** Canonical severity used by storage, APIs, and tools. */
export const severitySchema = lazySchema(() =>
  alertEventSeveritySchema.exclude(['info']).describe(SEVERITY_CONTRACT_RULE)
);

export type Severity = z.infer<typeof severitySchema>;

const SEVERITY_LABELS: Record<Severity, string> = {
  low: i18n.translate('xpack.significantEvents.severity.lowLabel', {
    defaultMessage: 'Low',
  }),
  medium: i18n.translate('xpack.significantEvents.severity.mediumLabel', {
    defaultMessage: 'Medium',
  }),
  high: i18n.translate('xpack.significantEvents.severity.highLabel', {
    defaultMessage: 'High',
  }),
  critical: i18n.translate('xpack.significantEvents.severity.criticalLabel', {
    defaultMessage: 'Critical',
  }),
};

/** Convert canonical sortable severity to its human-readable label. */
export const getSeverityLabel = (severity: Severity): string => SEVERITY_LABELS[severity];

export const significantEventBaseSchema = lazySchema(() =>
  z.object({
    event_id: z
      .string()
      .min(1)
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
      .optional()
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
  })
);
