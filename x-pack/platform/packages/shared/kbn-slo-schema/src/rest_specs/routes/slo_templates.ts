/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { MAX_ARRAY_LENGTH, MAX_KEYWORD_LENGTH, MAX_QUERY_LENGTH } from '../../schema/zod/limits';
import type { sloTemplateSchema } from '../../schema/zod/slo_template';

const getSLOTemplateParamsSchema = z.object({
  path: z.object({
    templateId: z.string().max(MAX_KEYWORD_LENGTH),
  }),
});

const findSLOTemplatesParamsSchema = z.object({
  query: z
    .object({
      search: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      tags: z
        .string()
        .max(MAX_QUERY_LENGTH)
        .transform((s) => s.split(',').map((t) => t.trim()))
        .pipe(z.array(z.string()).max(MAX_ARRAY_LENGTH))
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
