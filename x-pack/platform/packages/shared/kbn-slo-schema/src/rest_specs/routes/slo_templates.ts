/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import type { sloTemplateSchema } from '../../schema/zod/slo_template';

const getSLOTemplateParamsSchema = z.object({
  path: z.object({
    templateId: z.string(),
  }),
});

const findSLOTemplatesParamsSchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      tags: z
        .string()
        .transform((value) => value.split(','))
        .optional(),
      page: z.coerce.number().optional(),
      perPage: z.coerce.number().optional(),
    })
    .optional(),
});

type SLOTemplateResponse = z.input<typeof sloTemplateSchema>;
type GetSLOTemplateResponse = SLOTemplateResponse;
interface FindSLOTemplatesResponse {
  total: number;
  page: number;
  perPage: number;
  results: SLOTemplateResponse[];
}

interface FindSLOTemplateTagsResponse {
  tags: string[];
}

export { findSLOTemplatesParamsSchema, getSLOTemplateParamsSchema };
export type {
  SLOTemplateResponse,
  GetSLOTemplateResponse,
  FindSLOTemplatesResponse,
  FindSLOTemplateTagsResponse,
};
