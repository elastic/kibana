/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { z } from '@kbn/zod';
import { sloIdSchema } from '../../schema/slo';

const deleteSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
});

const deleteSLOParamsSchemaZod = {
  params: z.object({
    id: z.string({
      description: 'An identifier for the slo.',
    }),
  }),
};

export { deleteSLOParamsSchema, deleteSLOParamsSchemaZod };
