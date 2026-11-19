/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { compositeSloIdSchema } from '../../../schema/composite_slo';

const deleteCompositeSLOParamsSchema = z.object({
  path: z.object({
    id: compositeSloIdSchema,
  }),
});

export { deleteCompositeSLOParamsSchema };
