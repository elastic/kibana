/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
/** Bound on Markdown evidence descriptions and other free text an investigation writes. */
export declare const MAX_EVIDENCE_TEXT_LENGTH = 10000;
/** Bound on chart titles and annotation labels. */
export declare const MAX_EVIDENCE_SHORT_TEXT_LENGTH = 255;
/** Max series per evidence chart. */
export declare const MAX_EVIDENCE_CHART_SERIES = 5;
/** Max data points per evidence chart series. */
export declare const MAX_EVIDENCE_CHART_POINTS = 100;
/** Max annotations per evidence chart. */
export declare const MAX_EVIDENCE_CHART_ANNOTATIONS = 5;
/** Max length of axis labels, series names, and x values. */
export declare const MAX_EVIDENCE_CHART_LABEL_LENGTH = 128;
export declare const EVIDENCE_CHART_TYPES: readonly ['line', 'bar'];
export declare const EVIDENCE_CHART_X_AXIS_TYPES: readonly ['time', 'category'];
export declare const EVIDENCE_CHART_Y_AXIS_UNITS: readonly [
  'number',
  'percent',
  'bytes',
  'ms',
  's'
];
declare const evidenceChartSeriesSchema: z.ZodObject<
  {
    name: z.ZodString;
    points: z.ZodArray<
      z.ZodObject<
        {
          x: z.ZodString;
          y: z.ZodNumber;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
declare const evidenceChartAnnotationSchema: z.ZodObject<
  {
    x: z.ZodString;
    x_end: z.ZodOptional<z.ZodString>;
    label: z.ZodString;
  },
  z.core.$strip
>;
/**
 * A small static chart carried inline with a piece of evidence. The data points are part of the
 * spec itself, so the chart renders the same no matter where the data originally came from.
 * Deliberately limited to line and bar charts with a handful of series and annotations.
 */
export declare const evidenceChartSchema: z.ZodObject<
  {
    type: z.ZodEnum<{
      bar: 'bar';
      line: 'line';
    }>;
    title: z.ZodString;
    x_axis: z.ZodObject<
      {
        type: z.ZodEnum<{
          category: 'category';
          time: 'time';
        }>;
        label: z.ZodOptional<z.ZodString>;
      },
      z.core.$strip
    >;
    y_axis: z.ZodObject<
      {
        label: z.ZodOptional<z.ZodString>;
        unit: z.ZodOptional<
          z.ZodEnum<{
            bytes: 'bytes';
            ms: 'ms';
            number: 'number';
            percent: 'percent';
            s: 's';
          }>
        >;
      },
      z.core.$strip
    >;
    stacked: z.ZodOptional<z.ZodBoolean>;
    series: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          points: z.ZodArray<
            z.ZodObject<
              {
                x: z.ZodString;
                y: z.ZodNumber;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    annotations: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            x: z.ZodString;
            x_end: z.ZodOptional<z.ZodString>;
            label: z.ZodString;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strip
>;
export type EvidenceChart = z.infer<typeof evidenceChartSchema>;
export type EvidenceChartSeries = z.infer<typeof evidenceChartSeriesSchema>;
export type EvidenceChartAnnotation = z.infer<typeof evidenceChartAnnotationSchema>;
/**
 * One observation supporting a claim an investigation makes. Self-contained: a Markdown
 * description, a static chart, or both, so it works for data that is not in the local cluster.
 */
export declare const investigationEvidenceSchema: z.ZodObject<
  {
    description: z.ZodOptional<z.ZodString>;
    chart: z.ZodOptional<
      z.ZodObject<
        {
          type: z.ZodEnum<{
            bar: 'bar';
            line: 'line';
          }>;
          title: z.ZodString;
          x_axis: z.ZodObject<
            {
              type: z.ZodEnum<{
                category: 'category';
                time: 'time';
              }>;
              label: z.ZodOptional<z.ZodString>;
            },
            z.core.$strip
          >;
          y_axis: z.ZodObject<
            {
              label: z.ZodOptional<z.ZodString>;
              unit: z.ZodOptional<
                z.ZodEnum<{
                  bytes: 'bytes';
                  ms: 'ms';
                  number: 'number';
                  percent: 'percent';
                  s: 's';
                }>
              >;
            },
            z.core.$strip
          >;
          stacked: z.ZodOptional<z.ZodBoolean>;
          series: z.ZodArray<
            z.ZodObject<
              {
                name: z.ZodString;
                points: z.ZodArray<
                  z.ZodObject<
                    {
                      x: z.ZodString;
                      y: z.ZodNumber;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
          annotations: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  x: z.ZodString;
                  x_end: z.ZodOptional<z.ZodString>;
                  label: z.ZodString;
                },
                z.core.$strip
              >
            >
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type InvestigationEvidence = z.infer<typeof investigationEvidenceSchema>;
export {};
