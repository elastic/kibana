/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { CaseSeveritySchema, CaseStatusSchema } from '../../../common/types/domain';
import {
  MAX_EXTENDED_FIELD_FILTER_VALUE_LENGTH,
  MAX_EXTENDED_FIELD_FILTERS,
  MAX_TEMPLATE_DEFINITION_LENGTH,
} from '../../../common/constants';
import { limitedArraySchema, limitedStringSchema } from '../../../common/schema';

export const AllCasesURLQueryParamsSchema = z
  .object({
    search: z.string(),
    severity: z.array(CaseSeveritySchema),
    status: z.array(CaseStatusSchema),
    tags: z.array(z.string()),
    category: z.array(z.string()),
    assignees: z.array(z.union([z.string(), z.null()])),
    customFields: z.record(z.string(), z.array(z.string())),
    extendedFieldFilters: limitedArraySchema({
      codec: z.object({
        label: limitedStringSchema({
          fieldName: 'extendedFieldFilters.label',
          min: 1,
          max: MAX_TEMPLATE_DEFINITION_LENGTH,
        }),
        value: limitedStringSchema({
          fieldName: 'extendedFieldFilters.value',
          min: 1,
          max: MAX_EXTENDED_FIELD_FILTER_VALUE_LENGTH,
        }),
      }),
      fieldName: 'extendedFieldFilters',
      min: 0,
      max: MAX_EXTENDED_FIELD_FILTERS,
    }),
    from: z.string(),
    to: z.string(),
    sortOrder: z.union([z.literal('asc'), z.literal('desc')]),
    sortField: z.union([
      z.literal('closedAt'),
      z.literal('createdAt'),
      z.literal('updatedAt'),
      z.literal('severity'),
      z.literal('status'),
      z.literal('title'),
      z.literal('category'),
    ]),
    page: z.number(),
    perPage: z.number(),
  })
  .partial();

export const validateSchema = <T>(obj: unknown, schema: z.ZodType<T>): T | null => {
  const result = schema.safeParse(obj);
  return result.success ? result.data : null;
};
