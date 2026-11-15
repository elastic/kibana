/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

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
  label: z.string().max(MAX_EVIDENCE_SHORT_TEXT_LENGTH),
});

/**
 * A small static chart carried inline with a piece of evidence. The data points are part of the
 * spec itself, so the chart renders the same no matter where the data originally came from.
 * Deliberately limited to line and bar charts with a handful of series and annotations.
 */
export const evidenceChartSchema = z.object({
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
});
export type EvidenceChart = z.infer<typeof evidenceChartSchema>;
export type EvidenceChartSeries = z.infer<typeof evidenceChartSeriesSchema>;
export type EvidenceChartAnnotation = z.infer<typeof evidenceChartAnnotationSchema>;

/**
 * One observation supporting a claim an investigation makes. Self-contained: a Markdown
 * description, a static chart, or both, so it works for data that is not in the local cluster.
 */
export const investigationEvidenceSchema = z.object({
  /** Markdown: what was observed and why it matters. With a chart, only what the chart doesn't show. */
  description: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).optional(),
  /** Static chart visualizing the observation. */
  chart: evidenceChartSchema.optional(),
});
export type InvestigationEvidence = z.infer<typeof investigationEvidenceSchema>;
