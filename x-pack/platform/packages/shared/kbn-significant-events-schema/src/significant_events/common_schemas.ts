/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z, isoDateTime } from '@kbn/zod/v4';
import { alertEventSeveritySchema } from '@kbn/alerting-v2-schemas';
import type { AlertEventSeverity } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import dedent from 'dedent';
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_ARRAY_LENGTH,
  NO_RAW_SENSITIVE_VALUES_RULE,
  SYMPTOM_HYPOTHESIS_ROLE_RULE,
  SUMMARY_ROLE_RULE,
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
        "feature_id of the entity or infrastructure Knowledge Indicator initiating the call in this dependency relationship, copied from the dependency indicator's own source. The writer stores the resolved indicator id."
      ),
    target: z
      .string()
      .max(MAX_TITLE_LENGTH)
      .describe(
        "feature_id of the entity or infrastructure Knowledge Indicator being called or depended upon, copied from the dependency indicator's own target. The writer stores the resolved indicator id."
      ),
    protocol: z
      .string()
      .max(MAX_ID_LENGTH)
      .optional()
      .describe(
        'Communication protocol used between source and target (e.g. "HTTP", "gRPC", "TCP").'
      ),
    source_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .describe('Nightshift source id associated with this dependency.'),
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
    source_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .describe('Nightshift source id associated with this infrastructure component.'),
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
    source_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .describe('Nightshift source id associated with this entity.'),
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
    source_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .optional()
      .describe('Nightshift source id associated with this causal feature.'),
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
        from: isoDateTime({ offset: true }).describe('Inclusive window start bound to ?_tstart.'),
        to: isoDateTime({ offset: true }).describe('Exclusive window end bound to ?_tend.'),
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

const signalBaseSchema = lazySchema(() =>
  z.object({
    source_id: z
      .string()
      .max(MAX_ID_LENGTH)
      .describe('Nightshift source id this signal was collected from.'),
    description: z
      .string()
      .max(MAX_TEXT_LENGTH)
      .describe(
        dedent`
      What this signal's queries observed and what it affects, in plain prose a reader can act on, in at most three sentences.

      Name the concrete row signature and failing target — or, when nothing matched, what was looked for and what was found instead — then who or what is affected, how badly, for how long, and how broadly (the share of the operation, the number and share of parties, regions), using the numbers measured. Say whether the rows show the operation failing, slow, completing, or not settled, and name any sensitive data the rows expose by type. Report only what the queries observed: the verdict is recorded separately, and this text neither states it nor depends on it. Never say only that rows were returned.

      Do not name dependency chains, upstream causes, or topology here — use causal_features and blast_radius for that.
      ${NO_RAW_SENSITIVE_VALUES_RULE}
    `
      ),
    verdict: z
      .enum(SIGNAL_VERDICTS)
      .describe(
        'Conclusion for the authored rule hypothesis: confirms = a found row directly showing the failure or degradation; refutes = verified healthy, positive, or no-failure result; off_topic = query found an observation unrelated to the rule; inconclusive = the check could not establish a conclusion from the evidence (empty, errored, or found rows that do not directly show the outcome); not_checked = no query was available.'
      ),
    collected_at: isoDateTime({ offset: true })
      .optional()
      .describe('ISO timestamp when this signal was collected.'),
    evidence: signalEvidenceSchema
      .nullable()
      .optional()
      .describe(
        'ES|QL query verification for this signal. Present when a query was executed to confirm or refute the signal; null when no verification was run.'
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
      source_id: true,
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
            'An inconclusive verdict requires query evidence (empty, error, or found rows that do not directly show the outcome).',
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

/**
 * Severity field contract — single source of truth for schema `.describe()`, the discovery agent
 * and eval judges. It is the ladder the investigation agent applies. Order of `SEVERITY_OPTIONS`
 * is part of this contract (most-severe first).
 */
export const SEVERITY_CONTRACT_RULE = dedent`
    Severity rates the situation the grounding evidence confirms, whatever triggered the detection. It is the assessing agent's own verdict, decided from the confirming signals and the queries run — never from p_value, change_point_type, alert volume, the rule's severity_score or how alarming the rule looks. A concrete non-benign error in a found off-topic row evidences its own observed-error event; assess it from that row's error signature and impact.

    Decide in order and stop at the first match:
    - "critical": a global outage affecting all or most customers; several distinct core operations confirmed blocked at once (for example balance, history, and payment together); a mandatory service, job, or platform-critical operation confirmed blocked end-to-end so the component can no longer perform its primary function — unless the block is confined to a single endpoint or lookup path affecting only that one operation, which stays at "high"; or confirmed active exposure of PII, PCI DSS data, SSNs, credentials, secrets, or tokens.
    - "high": the affected operation fails or is blocked on the verified path — a confirming row or measure shows it not completing (failed requests or jobs, refused or timed-out calls) — or is broadly degraded, intermittent, or partially failing for a significant subset. A single endpoint or lookup path stays here even when every caller hits it. An error signature on the operation's path with no row or measure showing the operation failing to complete is not enough: that is "medium". A share of attempts or a breadth that was not measured changes nothing here: a confirming row showing the operation failing or timing out is enough for "high".
    - "medium": minor confirmed degradation with limited reach, or the evidence never settled whether the operation fails to complete versus only logs an error or slows. Not for a confirmed failing operation merely because its share or breadth was not measured.
    - "low": confirmed recovery, or confirmed absence of impact: noise, a false alarm, or a non-issue, including an internal dependency error the system demonstrably tolerates.

    Rate what the evidence shows, with the numbers measured: how much of the operation fails, how many parties are affected, and whether it is still happening. Evidence that could not be collected (a query that timed out or returned nothing) leaves the question unsettled, and the ladder rates unsettled evidence "medium"; it is never grounds for "low". Weigh scope by what the operations do, not by how many detections fired. Signals on the same operation overlap: rate that operation from its most direct failure measure (the share of attempts that fail, otherwise the share of log lines), never by adding shares across signals or taking the highest of differently scoped ones.
    A mandatory component is one that the event's blast_radius shows other services depending on; when it shows none, that clause does not apply.

  Tie-break: when two adjacent tiers both match the same evidence, choose the lower only when the evidence leaves genuinely unresolved whether the operation still completes, and never below "medium" on that ground.`;

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
      Choose the narrowest stable affected scope that this event's assigned signals directly evidence: operation, then unique service/entity, then flow, then domain. Use flow or domain only when multiple distinct services or operations are grouped in this same event. A single-detection or single-service event must not use a customer journey, product flow, or domain label when a narrower service or operation is confirmed. Never use a generic source name.
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
        Provisional, evidence-grounded technical mechanism for this incident.
        ${SYMPTOM_HYPOTHESIS_ROLE_RULE}
        Good: "inventory-db refuses connections on port 5432, so checkout stock reads fail." Bad: "A backend connectivity issue is impacting multiple flows."
        Do not use generic terms such as "backend unavailability" or "dependency failure" when the evidence identifies a component, resource, endpoint, protocol, or error signature.
        On a continuation, extend the stored hypothesis: keep its existing wording for the mechanism it already establishes and add only what the new evidence supports; leave it unchanged when nothing new is evidenced. A single healthy or unrelated signal never replaces a mechanism that other signals on the event still confirm.
        ${NO_RAW_SENSITIVE_VALUES_RULE}
        `
      ),
    summary: z
      .string()
      .max(MAX_TEXT_LENGTH)
      .describe(
        dedent`
        Objective, self-contained account of the observed state and potential impact.
        ${SUMMARY_ROLE_RULE}
        Good: "inventory-db refuses connections on port 5432 (SQLState 08001), failing checkout stock reads. Impact is confirmed for 18.5% of the operation's log lines; first seen 40 minutes ago and still active." Bad: "The verification returned no rows, so a backend connectivity issue is probably causing instability."
        On a continuation, build on the stored summary: keep its existing wording, including its opening sentence, for the signatures and paths it already covers (rephrase only to stay within three sentences), add sentences only for what is newly confirmed, and never rewrite it; leave it unchanged when nothing new matters to an operator. Counts and timestamps change every cycle, so keep them out of it. A single healthy or unrelated signal never replaces what other signals on the event still confirm.
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
    source_ids: z
      .array(z.string().max(MAX_ID_LENGTH))
      .max(MAX_ARRAY_LENGTH)
      .describe('Nightshift source ids associated with this event.'),

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
