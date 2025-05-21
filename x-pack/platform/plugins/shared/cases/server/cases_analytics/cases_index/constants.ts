/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const CAI_CASES_INDEX_NAME = '.internal.cases';

export const CAI_CASES_SOURCE_QUERY: QueryDslQueryContainer = {
  term: {
    type: 'cases',
  },
};

export const CAI_CASES_SOURCE_INDEX = '.kibana_alerting_cases';
