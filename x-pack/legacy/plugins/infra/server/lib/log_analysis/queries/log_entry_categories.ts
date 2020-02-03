/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import { defaultRequestParameters, getMlResultIndex } from './common';

export const createLogEntryCategoriesQuery = (
  logEntryCategoriesJobId: string,
  categoryIds: number[]
) => ({
  ...defaultRequestParameters,
  body: {
    query: {
      bool: {
        filter: [
          {
            terms: {
              category_id: categoryIds,
            },
          },
        ],
      },
    },
    _source: ['category_id', 'regex'],
  },
  index: getMlResultIndex(logEntryCategoriesJobId),
  size: categoryIds.length,
});

export const logEntryCategoryHitRT = rt.type({
  _source: rt.type({
    category_id: rt.number,
    regex: rt.string,
  }),
});

export type LogEntryCategoryHit = rt.TypeOf<typeof logEntryCategoryHitRT>;

export const logEntryCategoriesResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    hits: rt.type({
      hits: rt.array(logEntryCategoryHitRT),
    }),
  }),
]);

export type logEntryCategoriesResponse = rt.TypeOf<typeof logEntryCategoriesResponseRT>;
