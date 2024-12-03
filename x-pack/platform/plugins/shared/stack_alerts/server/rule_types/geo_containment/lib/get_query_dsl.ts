/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fromKueryExpression,
  toElasticsearchQuery,
  luceneStringToDsl,
  DataViewBase,
  Query,
} from '@kbn/es-query';

export const getQueryDsl = (query: Query, indexPattern?: DataViewBase) => {
  if (query.language === 'kuery') {
    return toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
  }

  return luceneStringToDsl(query.query);
};
