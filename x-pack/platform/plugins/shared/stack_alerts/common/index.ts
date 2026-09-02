/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getComparatorScript, getHumanReadableComparator } from './comparator';

export type { EsqlResultRow, EsqlTable } from './es_query';
export {
  rowToDocument,
  transformToEsqlTable,
  getEsqlQueryHits,
  ALERT_ID_COLUMN,
  ALERT_ID_SUGGESTED_MAX,
  ES_QUERY_MAX_HITS_PER_EXECUTION,
  ES_QUERY_MAX_HITS_PER_EXECUTION_SERVERLESS,
  ESQL_RESULTS_MAX_ROWS_PER_EXECUTION,
  ESQL_RESULTS_MAX_BYTES_PER_EXECUTION,
} from './es_query';
