/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
export declare const singleMetricViewerEmbeddableStateSchema: z.ZodObject<
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
    selected_detector_index: z.ZodDefault<z.ZodNumber>;
    selected_entities: z.ZodOptional<
      z.ZodRecord<z.ZodString, z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>
    >;
    function_description: z.ZodOptional<z.ZodString>;
    forecast_id: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export type SingleMetricViewerEmbeddableState = z.output<
  typeof singleMetricViewerEmbeddableStateSchema
>;
