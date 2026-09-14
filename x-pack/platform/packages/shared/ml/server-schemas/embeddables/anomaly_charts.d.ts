/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';
export declare const severityThresholdSchema: z.ZodUnion<
  readonly [
    z.ZodObject<
      {
        min: z.ZodLiteral<ML_ANOMALY_THRESHOLD.LOW>;
        max: z.ZodLiteral<ML_ANOMALY_THRESHOLD.WARNING>;
      },
      z.core.$strict
    >,
    z.ZodObject<
      {
        min: z.ZodLiteral<ML_ANOMALY_THRESHOLD.WARNING>;
        max: z.ZodLiteral<ML_ANOMALY_THRESHOLD.MINOR>;
      },
      z.core.$strict
    >,
    z.ZodObject<
      {
        min: z.ZodLiteral<ML_ANOMALY_THRESHOLD.MINOR>;
        max: z.ZodLiteral<ML_ANOMALY_THRESHOLD.MAJOR>;
      },
      z.core.$strict
    >,
    z.ZodObject<
      {
        min: z.ZodLiteral<ML_ANOMALY_THRESHOLD.MAJOR>;
        max: z.ZodLiteral<ML_ANOMALY_THRESHOLD.CRITICAL>;
      },
      z.core.$strict
    >,
    z.ZodObject<
      {
        min: z.ZodNumber;
      },
      z.core.$strict
    >
  ]
>;
export type SeverityThreshold = z.output<typeof severityThresholdSchema>;
export declare const anomalyChartsEmbeddableStateSchema: z.ZodObject<
  {
    description: z.ZodOptional<z.ZodString>;
    hide_title: z.ZodOptional<z.ZodBoolean>;
    title: z.ZodOptional<z.ZodString>;
    hide_border: z.ZodOptional<z.ZodBoolean>;
    time_range: z.ZodOptional<
      z.ZodObject<
        {
          from: z.ZodString;
          to: z.ZodString;
          mode: z.ZodOptional<
            z.ZodUnion<readonly [z.ZodLiteral<'absolute'>, z.ZodLiteral<'relative'>]>
          >;
        },
        z.core.$strict
      >
    >;
    job_ids: z.ZodArray<z.ZodString>;
    max_series_to_plot: z.ZodOptional<z.ZodNumber>;
    severity_threshold: z.ZodOptional<
      z.ZodArray<
        z.ZodUnion<
          readonly [
            z.ZodObject<
              {
                min: z.ZodLiteral<ML_ANOMALY_THRESHOLD.LOW>;
                max: z.ZodLiteral<ML_ANOMALY_THRESHOLD.WARNING>;
              },
              z.core.$strict
            >,
            z.ZodObject<
              {
                min: z.ZodLiteral<ML_ANOMALY_THRESHOLD.WARNING>;
                max: z.ZodLiteral<ML_ANOMALY_THRESHOLD.MINOR>;
              },
              z.core.$strict
            >,
            z.ZodObject<
              {
                min: z.ZodLiteral<ML_ANOMALY_THRESHOLD.MINOR>;
                max: z.ZodLiteral<ML_ANOMALY_THRESHOLD.MAJOR>;
              },
              z.core.$strict
            >,
            z.ZodObject<
              {
                min: z.ZodLiteral<ML_ANOMALY_THRESHOLD.MAJOR>;
                max: z.ZodLiteral<ML_ANOMALY_THRESHOLD.CRITICAL>;
              },
              z.core.$strict
            >,
            z.ZodObject<
              {
                min: z.ZodNumber;
              },
              z.core.$strict
            >
          ]
        >
      >
    >;
  },
  z.core.$strip
>;
export type AnomalyChartsEmbeddableState = z.output<typeof anomalyChartsEmbeddableStateSchema>;
