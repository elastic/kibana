/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

// Shape copied from `@kbn/significant-events-schema` (#293532) so every investigation entity
// shares one evidence format. The significant-events copy is removed once Nightshift reads
// investigations from this plugin.

/** Bound on Markdown evidence descriptions and other free text an investigation writes. */
export const MAX_EVIDENCE_TEXT_LENGTH = 10_000;
/** Bound on chart titles and annotation labels. */
export const MAX_EVIDENCE_SHORT_TEXT_LENGTH = 255;
/** Max series per evidence chart. */
export const MAX_EVIDENCE_CHART_SERIES = 5;
/** Max data points per evidence chart series. */
export const MAX_EVIDENCE_CHART_POINTS = 100;
/** Max annotations per evidence chart. */
export const MAX_EVIDENCE_CHART_ANNOTATIONS = 5;
/** Max length of axis labels, series names, and x values. */
export const MAX_EVIDENCE_CHART_LABEL_LENGTH = 128;

/** Max references (links and queries) per piece of evidence. */
export const MAX_EVIDENCE_REFERENCES = 10;
/** Max length of a reference URL. */
export const MAX_EVIDENCE_REFERENCE_URL_LENGTH = 2048;

export const EVIDENCE_CHART_TYPES = ['line', 'bar'] as const;
export const EVIDENCE_CHART_X_AXIS_TYPES = ['time', 'category'] as const;
export const EVIDENCE_CHART_Y_AXIS_UNITS = ['number', 'percent', 'bytes', 'ms', 's'] as const;

const evidenceChartPointSchema = lazySchema(() => z.object({
  /** ISO 8601 timestamp for a `time` x axis, a category label for a `category` x axis. */
  x: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH),
  y: z.number(),
}));

const evidenceChartSeriesSchema = lazySchema(() => z.object({
  name: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH),
  points: z.array(evidenceChartPointSchema).max(MAX_EVIDENCE_CHART_POINTS),
}));

const evidenceChartAnnotationSchema = lazySchema(() => z.object({
  /** Where the annotation sits: a timestamp or category, matching the x axis type. */
  x: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH),
  /** When set, the annotation highlights the range from `x` to `x_end` instead of a point. */
  x_end: z.string().max(MAX_EVIDENCE_CHART_LABEL_LENGTH).optional(),
  label: z.string().max(MAX_EVIDENCE_SHORT_TEXT_LENGTH),
}));

/**
 * A small static chart carried inline with a piece of evidence. The data points are part of the
 * spec itself, so the chart renders the same no matter where the data originally came from.
 * Deliberately limited to line and bar charts with a handful of series and annotations.
 */
export const evidenceChartSchema = lazySchema(() => z.object({
  type: z.enum(EVIDENCE_CHART_TYPES),
  title: z.string().max(MAX_EVIDENCE_SHORT_TEXT_LENGTH),
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
}));
export type EvidenceChart = z.infer<typeof evidenceChartSchema>;
export type EvidenceChartSeries = z.infer<typeof evidenceChartSeriesSchema>;
export type EvidenceChartAnnotation = z.infer<typeof evidenceChartAnnotationSchema>;

/** A link to a page that backs the observation, opened in a new tab. Only http(s) URLs. */
export const evidenceLinkReferenceSchema = lazySchema(() => z.object({
  url: z
    .string()
    .max(MAX_EVIDENCE_REFERENCE_URL_LENGTH)
    .regex(/^https?:\/\//i, 'Must be an http(s) URL'),
  /** Short text to show instead of the URL. */
  label: z.string().max(MAX_EVIDENCE_SHORT_TEXT_LENGTH).optional(),
}));

/** A query (ES|QL, SQL, TempoQL, ...) the user can copy and re-run to verify the observation. */
export const evidenceQueryReferenceSchema = lazySchema(() => z.object({
  query: z.string().min(1).max(MAX_EVIDENCE_TEXT_LENGTH),
}));

/** A link or a query the user can follow or copy to check the evidence themselves. */
export const evidenceReferenceSchema = lazySchema(() => z.union([
  evidenceLinkReferenceSchema.strict(),
  evidenceQueryReferenceSchema.strict(),
]));
export type EvidenceLinkReference = z.infer<typeof evidenceLinkReferenceSchema>;
export type EvidenceQueryReference = z.infer<typeof evidenceQueryReferenceSchema>;
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;

/** Whether a reference is a link rather than a query. */
export const isEvidenceLinkReference = (
  reference: EvidenceReference
): reference is EvidenceLinkReference => 'url' in reference;

/**
 * One observation supporting a claim an investigation makes. Self-contained: a Markdown
 * description, a static chart, or both, so it works for data that is not in the local cluster.
 */
export const investigationEvidenceSchema = lazySchema(() => z.object({
  /** Markdown: what was observed and why it matters. With a chart, only what the chart doesn't show. */
  description: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  /** Static chart visualizing the observation. */
  chart: evidenceChartSchema.optional(),
  /** Links and queries that let the user verify the observation. */
  references: z
    .array(evidenceReferenceSchema)
    .max(MAX_EVIDENCE_REFERENCES)
    .optional()
    .describe(
      'Where the observation came from, so the user can verify it: `{ "url" }` (with an optional short `label`) for an http(s) link such as a dashboard, issue, PR, or doc, and `{ "query" }` for a query you ran (ES|QL, SQL, TempoQL, ...).'
    ),
}));
export type InvestigationEvidence = z.infer<typeof investigationEvidenceSchema>;
