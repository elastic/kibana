/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';
import { schema } from '@kbn/config-schema';
import { backfillResponseSchemaV1 } from '../../../response';

export const getBackfillExamples = () => path.join(__dirname, 'examples_get_backfill.yaml');

export const getParamsSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The identifier for the backfill.',
    },
  }),
});

export const getResponseSchema = backfillResponseSchemaV1;
