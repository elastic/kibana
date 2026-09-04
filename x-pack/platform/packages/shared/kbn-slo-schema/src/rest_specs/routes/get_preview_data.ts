/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { boundedProjectRoutingSchema, objectiveSchema } from '../../schema/zod/slo';
import { indicatorSchema } from '../../schema/zod/indicators';
import { dateType, groupingsSchema } from '../../schema/zod/common';

const getPreviewDataParamsSchema = z.object({
  body: z.object({
    indicator: indicatorSchema,
    range: z.object({
      from: dateType,
      to: dateType,
    }),
    objective: objectiveSchema.optional(),
    remoteName: z.string().optional(),
    groupings: groupingsSchema.optional(),
    groupBy: z.array(z.string()).optional(),
    projectRoutings: boundedProjectRoutingSchema.nullable().optional(),
  }),
});

const previewDataResponseSchema = z.object({
  date: dateType,
  sliValue: z.number().nullable(),
  events: z
    .object({
      good: z.number(),
      bad: z.number(),
      total: z.number(),
    })
    .optional(),
});

const getPreviewDataResponseSchema = z.object({
  results: z.array(previewDataResponseSchema),
  groups: z.record(z.string(), z.array(previewDataResponseSchema)).optional(),
});

type GetPreviewDataParams = z.output<typeof getPreviewDataParamsSchema.shape.body>;
type GetPreviewDataResponse = z.input<typeof getPreviewDataResponseSchema>;

export { getPreviewDataParamsSchema, getPreviewDataResponseSchema, previewDataResponseSchema };
export type { GetPreviewDataParams, GetPreviewDataResponse };
