/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getComparatorScript, getHumanReadableComparator } from './comparator';

export type { EsqlTable } from './esql_query_utils';
export {
  rowToDocument,
  transformDatatableToEsqlTable,
  getEsqlQueryHits,
  ALERT_ID_COLUMN,
} from './esql_query_utils';

export {
  ES_QUERY_MAX_HITS_PER_EXECUTION,
  ES_QUERY_MAX_HITS_PER_EXECUTION_SERVERLESS,
} from './constants';
