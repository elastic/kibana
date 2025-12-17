/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { arrayToStringRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import type { sloTemplateSchema } from '../../schema';

const getSLOTemplateParamsSchema = t.type({
  path: t.type({
    templateId: t.string,
  }),
});

type GetSLOTemplateResponse = t.OutputOf<typeof sloTemplateSchema>;

const findSLOTemplatesParamsSchema = t.type({
  query: t.union([
    t.undefined,
    t.partial({
      search: t.string,
      tags: arrayToStringRt.pipe(t.array(t.string)),
      page: toNumberRt,
      perPage: toNumberRt,
    }),
  ]),
});

interface FindSLOTemplatesResponse {
  total: number;
  page: number;
  perPage: number;
  results: GetSLOTemplateResponse[];
}

export { findSLOTemplatesParamsSchema, getSLOTemplateParamsSchema };
export type { GetSLOTemplateResponse, FindSLOTemplatesResponse };
