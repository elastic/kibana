/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { getQueryWithParams } from './get_query_with_params';
import { getRequestBase } from './get_request_base';

export const getTotalDocCountRequest = (
  params: AiopsLogRateAnalysisSchema
): estypes.SearchRequest => ({
  ...getRequestBase(params),
  body: {
    fields: ['*'],
    _source: false,
    query: getQueryWithParams({ params }),
    size: 0,
    track_total_hits: true,
  },
});
