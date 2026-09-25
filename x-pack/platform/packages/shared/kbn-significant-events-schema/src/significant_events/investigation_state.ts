/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { severitySchema } from './common_schemas';
import {
  MAX_ID_LENGTH,
  MAX_MEDIUM_STRING_LENGTH,
  MAX_SHORT_STRING_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_TIMESTAMP_LENGTH,
  MAX_TITLE_LENGTH,
} from './constants';

/**
 * Name of the `tool_ui` custom event emitted by the investigation agent's progress-report
 * tool. Consumers follow the agent execution's event stream and filter for this event to
 * receive live, schema-typed updates while the investigation is still running. Every emission
 * carries the FULL current investigation state (never a delta) — see
 * {@link investigationStateSchema}.
 */
export const INVESTIGATION_PROGRESS_UI_EVENT = 'investigation_progress' as const;

/**
 * Name of the step in `investigation_workflow.yaml` whose structured output holds the final
 * investigation state. Consumers reading the persisted result off a workflow execution look up
 * the step execution with this `stepId` — keep it in sync with the step name in the YAML.
 */
export const INVESTIGATE_STEP_ID = 'investigate' as const;

export type InvestigationRunStatus = 'pending' | 'complete' | 'failed' | 'unavailable';

/** Max series per evidence chart. Keep in sync with the YAML maxItems. */
export const MAX_EVIDENCE_CHART_SERIES = 5;
/** Max data points per evidence chart series. Keep in sync with the YAML maxItems. */
export const MAX_EVIDENCE_CHART_POINTS = 100;
/** Max annotations per evidence chart. Keep in sync with the YAML maxItems. */
export const MAX_EVIDENCE_CHART_ANNOTATIONS = 5;
/** Max length of chart titles, labels, and series names. */
export const MAX_EVIDENCE_CHART_LABEL_LENGTH = 128;

export const EVIDENCE_CHART_TYPES = ['line', 'bar'] as const;
export const EVIDENCE_CHART_X_AXIS_TYPES = ['time', 'category'] as const;
export const EVIDENCE_CHART_Y_AXIS_UNITS = ['number', 'percent', 'bytes', 'ms', 's'] as const;

const evidenceChartPointSchema = z.object({
  /** ISO 8601 timestamp for a `time` x axis, a category label for a `category` x axis. */
  x: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH),
  y: z.number(),
});

const evidenceChartSeriesSchema = z.object({
  name: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH),
  points: z.array(evidenceChartPointSchema).max(MAX_EVIDENCE_CHART_POINTS),
});

const evidenceChartAnnotationSchema = z.object({
  /** Where the annotation sits: a timestamp or category, matching the x axis type. */
  x: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH),
  /** When set, the annotation highlights the range from `x` to `x_end` instead of a point. */
  x_end: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH).optional(),
  label: z.string().max(MAX_SHORT_STRING_LENGTH),
});

/**
 * A small static chart carried inline with a piece of evidence. The data points are part of the
 * spec itself, so the chart renders the same no matter where the data originally came from —
 * the local cluster, a remote cluster reached through a connector, or any other source.
 * Deliberately limited to line and bar charts with a handful of series and annotations.
 */
export const evidenceChartSchema = z.object({
  type: z.enum(EVIDENCE_CHART_TYPES),
  title: z.string().max(MAX_SHORT_STRING_LENGTH),
  x_axis: z.object({
    type: z.enum(EVIDENCE_CHART_X_AXIS_TYPES),
    label: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH).optional(),
  }),
  y_axis: z.object({
    label: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH).optional(),
    /** How y values are formatted. `percent` values are on a 0–100 scale. */
    unit: z.enum(EVIDENCE_CHART_Y_AXIS_UNITS).optional(),
  }),
  /** Stack the series on top of each other. Only meaningful for bar charts. */
  stacked: z.boolean().optional(),
  series: z.array(evidenceChartSeriesSchema).min(1).max(MAX_EVIDENCE_CHART_SERIES),
  annotations: z
    .array(evidenceChartAnnotationSchema)
    .max(MAX_EVIDENCE_CHART_ANNOTATIONS)
    .optional(),
});
export type EvidenceChart = z.infer<typeof evidenceChartSchema>;
export type EvidenceChartSeries = z.infer<typeof evidenceChartSeriesSchema>;
export type EvidenceChartAnnotation = z.infer<typeof evidenceChartAnnotationSchema>;

/**
 * One observation supporting a claim the investigation makes. Evidence is self-contained: a
 * Markdown description (text, tables, links) and an optional static chart, so it works for every
 * data source, including data that is not available in the local cluster.
 */
export const investigationEvidenceSchema = z.object({
  /** Markdown: what was observed and why it bears on the claim. Tables and links are allowed. */
  description: z.string().max(MAX_TEXT_LENGTH),
  /** Optional static chart visualizing the observation. */
  chart: evidenceChartSchema.optional(),
});
export type InvestigationEvidence = z.infer<typeof investigationEvidenceSchema>;

/** Max entity entries in the impact block. Keep in sync with the YAML maxItems. */
export const MAX_IMPACT_ENTITIES = 10;

export const investigationImpactEntitySchema = z.object({
  /** Human-readable name — service name, host, or component. Prefer service names. */
  name: z.string().max(MAX_TITLE_LENGTH),
  /** Entity category. Prefer "service"; use "host", "database", etc. only when no service applies. */
  type: z.string().max(MAX_ID_LENGTH).optional(),
  /** KI feature_id when this entity is backed by a Knowledge Indicator. */
  feature_id: z.string().max(MAX_ID_LENGTH).optional(),
  stream_name: z.string().max(MAX_ID_LENGTH).optional(),
  /**
   * One evidence artifact linking this entity to the investigation — ideally a chart of the
   * failure signal for this entity.
   */
  evidence: investigationEvidenceSchema.optional(),
});
export type InvestigationImpactEntity = z.infer<typeof investigationImpactEntitySchema>;

export const investigationImpactSchema = z.object({
  /**
   * Business-facing account of the impact: what was affected, how badly, for how long, and how
   * broadly (users, requests, regions). Lets a reader prioritise and explain the incident.
   */
  summary: z.string().max(MAX_TEXT_LENGTH).optional(),
  entities: z.array(investigationImpactEntitySchema).max(MAX_IMPACT_ENTITIES),
});
export type InvestigationImpact = z.infer<typeof investigationImpactSchema>;

/** Max timeline events an investigation can emit. Keep in sync with the YAML maxItems. */
export const MAX_TIMELINE_EVENTS = 20;

export const INVESTIGATION_TIMELINE_EVENT_TYPES = [
  'change',
  'symptom',
  'alert',
  'recovery',
  'other',
] as const;

/**
 * One relevant event in the investigated system — a deploy or config change, the onset of a
 * symptom, an alert firing, a recovery. Not the investigation's own steps.
 */
export const investigationTimelineEventSchema = z.object({
  /** When it happened, as an ISO 8601 timestamp. */
  timestamp: z.string().max(MAX_TIMESTAMP_LENGTH),
  type: z.enum(INVESTIGATION_TIMELINE_EVENT_TYPES),
  /** What happened, as one short plain-text sentence. */
  summary: z.string().max(MAX_MEDIUM_STRING_LENGTH),
});
export type InvestigationTimelineEvent = z.infer<typeof investigationTimelineEventSchema>;

const timestampSortKey = (timestamp: string): number => {
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

/** Chronological order; events with unparseable timestamps keep their order at the end. */
const sortByTimestamp = (events: InvestigationTimelineEvent[]): InvestigationTimelineEvent[] =>
  [...events].sort(
    (first, second) => timestampSortKey(first.timestamp) - timestampSortKey(second.timestamp)
  );

/** Max evidence entries per hypothesis. Keep in sync with the YAML maxItems. */
export const MAX_HYPOTHESIS_EVIDENCE = 3;

const investigationHypothesisStatusSchema = z.enum(['investigating', 'dismissed', 'confirmed']);

export const investigationHypothesisSchema = z.object({
  /** The candidate cause under consideration. */
  candidate: z.string().max(MAX_TEXT_LENGTH),
  /** Current confidence in this specific hypothesis. */
  confidence: z.number().min(0).max(1),
  status: investigationHypothesisStatusSchema,
  /** Why this hypothesis was dismissed/confirmed, or the current reasoning while investigating. */
  reason: z.string().max(MAX_TEXT_LENGTH).optional(),
  /**
   * What the verdict rests on.
   */
  evidence: z.array(investigationEvidenceSchema).max(MAX_HYPOTHESIS_EVIDENCE).optional(),
});
export type InvestigationHypothesis = z.infer<typeof investigationHypothesisSchema>;

/** Max recommendation entries a current investigation can emit. Keep in sync with YAML maxItems. */
export const MAX_RECOMMENDATIONS = 3;

const investigationItemConfidenceSchema = z.number().min(0).max(1);

const sortByConfidence = <T extends { confidence: number }>(items: T[]): T[] =>
  [...items].sort((first, second) => second.confidence - first.confidence);

/**
 * One concrete, actionable step to resolve or mitigate the issue — a command, config change, or
 * code fix, rather than general advice like "investigate further". Structured so consumers can
 * render a "Try next" list without parsing prose for headings and bullets.
 */
export const investigationRecommendationSchema = z.object({
  /** The action itself, stated concretely as plain text with no Markdown or HTML. Put explanations
   * and links in `description`, and commands or snippets in `code`. */
  title: z.string().max(MAX_MEDIUM_STRING_LENGTH),
  /** How strongly the findings support that this action will resolve or mitigate the confirmed problem. */
  confidence: investigationItemConfidenceSchema,
  /** Why this step helps, or detail needed to carry it out, when the title alone isn't enough. */
  description: z.string().max(MAX_TEXT_LENGTH).optional(),
  /** A command, config snippet, or code change backing this step, when one applies. Raw source,
   * not a fenced markdown block — consumers decide how to render it. */
  code: z.string().max(MAX_TEXT_LENGTH).optional(),
});
export type InvestigationRecommendation = z.infer<typeof investigationRecommendationSchema>;

/** Max blind spot entries a current investigation can emit. Keep in sync with YAML maxItems. */
export const MAX_BLIND_SPOTS = 3;

/**
 * A signal the agent wanted but could not access (e.g. missing instrumentation) — an actionable
 * knowledge gap, not an incident-specific fact. Structured so consumers don't have to split a
 * "title · description" sentence themselves.
 */
export const investigationBlindSpotSchema = z.object({
  /** The missing data source or access, named concisely as plain text with no Markdown or HTML.
   * Put explanations and links in `description`. */
  title: z.string().max(MAX_MEDIUM_STRING_LENGTH),
  /** How strongly the findings support that closing this gap would materially improve the investigation. */
  confidence: investigationItemConfidenceSchema,
  /** Why this gap mattered to the investigation. */
  description: z.string().max(MAX_TEXT_LENGTH),
});
export type InvestigationBlindSpot = z.infer<typeof investigationBlindSpotSchema>;

/** Max hypotheses an investigation can track. Keep in sync with the YAML maxItems. */
export const MAX_HYPOTHESES = 50;

/**
 * Full state of an investigation at a point in time. This is the ONE schema shared by:
 * - every `investigation_progress` `tool_ui` event emitted while the investigation runs (always
 *   the complete current state, never a delta — so the latest event alone is enough to render), and
 * - the `investigate` step's final structured output in `investigation_workflow.yaml` (kept in
 *   sync with this schema by hand — cross-reference the comment there).
 *
 * Because both paths share this shape, a consumer renders identically whether it's following the
 * live stream or reading the persisted final result.
 */
export const investigationStateSchema = z.object({
  /**
   * Short headline naming the affected entity and the problem, shown as the investigation's title
   * in the list and flyout. Seeded from the trigger (event title, alert rule name) and sharpened
   * as the cause becomes clear. Optional so a snapshot without one keeps the seeded title.
   */
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  /**
   * "What happened": a short, factual TL;DR of the observed issue and the findings — symptoms,
   * observations, and what was established. While running, what is happening right now. The
   * root-cause narrative belongs in `conclusion`.
   */
  summary: z.string().max(MAX_TEXT_LENGTH),
  hypotheses: z.array(investigationHypothesisSchema).max(MAX_HYPOTHESES),
  /**
   * The final answer — the best-supported explanation of why the issue occurred, as plain prose
   * (no markdown headings or bullet lists). Populated once a hypothesis is `confirmed`; absent
   * while still investigating. Actionable steps belong in `recommendations`, not here.
   */
  conclusion: z.string().max(MAX_TEXT_LENGTH).optional(),
  /**
   * How severe the investigated situation turned out to be, on the shared severity tier scale
   * (see {@link severitySchema}). Set for every investigation whatever triggered it — an alert, a
   * significant event, or a free-form issue — and rated from what the run confirmed, never copied
   * from a severity the trigger already carried.
   *
   * Optional for the same reason `conclusion` is: the agent settles it at the end, so live progress
   * reports carry it only once they reach that point, and investigations persisted before this
   * field existed still parse. The instructions require the final output to set it, so an absent
   * severity in a completed result means unrated, not low.
   */
  severity: severitySchema
    .describe(
      'How severe the investigated situation is, rated on the tier ladder in the investigator instructions from what the investigation confirmed.'
    )
    .optional(),
  /** Concrete, actionable steps to resolve or mitigate the issue. */
  recommendations: z
    .array(investigationRecommendationSchema)
    .max(MAX_RECOMMENDATIONS)
    .overwrite(sortByConfidence)
    .optional(),
  /**
   * Actionable knowledge gaps discovered during the investigation. Replaces the legacy free-text
   * `gaps_found` string array, which this schema ignores.
   */
  blind_spots: z
    .array(investigationBlindSpotSchema)
    .max(MAX_BLIND_SPOTS)
    .overwrite(sortByConfidence)
    .optional(),
  /**
   * Structured account of which services or components were impacted. Optional so existing
   * persisted investigations remain valid. Seeded from alert grouping or sig event causal
   * features; finalized after hypotheses settle. At most 10 entries; service-level preferred.
   */
  impact: investigationImpactSchema.optional(),
  /**
   * Chronological list of the relevant events in the investigated system (changes, symptoms,
   * alerts, recoveries). Optional so existing persisted investigations remain valid.
   */
  timeline: z
    .array(investigationTimelineEventSchema)
    .max(MAX_TIMELINE_EVENTS)
    .overwrite(sortByTimestamp)
    .optional(),
});
export type InvestigationState = z.infer<typeof investigationStateSchema>;
