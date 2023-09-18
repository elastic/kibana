/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const DEFAULT_QUERY = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};

/**
 * Default DSL query which matches all the results
 */
export function getDefaultDSLQuery(): QueryDslQueryContainer {
  return cloneDeep(DEFAULT_QUERY);
}
