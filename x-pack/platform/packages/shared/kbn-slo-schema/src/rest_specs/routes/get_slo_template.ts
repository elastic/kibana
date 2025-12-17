/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { sloTemplateSchema } from '../../schema';

const getSLOTemplateParamsSchema = t.type({
  path: t.type({
    templateId: t.string,
  }),
});

type GetSLOTemplateResponse = t.OutputOf<typeof sloTemplateSchema>;

export { getSLOTemplateParamsSchema };
export type { GetSLOTemplateResponse };
