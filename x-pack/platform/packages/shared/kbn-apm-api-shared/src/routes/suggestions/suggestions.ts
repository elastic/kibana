/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface SuggestionsResponse {
  terms: string[];
}

export const suggestionsRoute = defineRoute<SuggestionsResponse>()({
  endpoint: 'GET /internal/apm/suggestions',
  params: t.type({
    query: t.intersection([
      t.type({
        fieldName: t.string,
        fieldValue: t.string,
      }),
      rangeRt,
      t.partial({ serviceName: t.string }),
    ]),
  }),
});
