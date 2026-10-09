/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { entityMaintainersRegistry } from '../../../../tasks/entity_maintainers/entity_maintainers_registry';

function validateMaintainerIdExists(data: { id: string }, ctx: z.RefinementCtx): void {
  if (!entityMaintainersRegistry.hasId(data.id)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['id'],
      message: 'Entity maintainer not found',
    });
  }
}

export const maintainerIdParamsSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
  })
  .superRefine(validateMaintainerIdExists);

export const maintainerIdsQuerySchema = z.object({
  ids: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional(),
});

export const runMaintainerQuerySchema = z.object({
  sync: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
});

export const initMaintainersBodySchema = z
  .object({
    autoStart: z.boolean().optional().default(true),
  })
  .optional();
