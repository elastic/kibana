/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { EsqlTable } from './esql_query_utils';
export {
  rowToDocument,
  transformDatatableToEsqlTable,
  getEsqlQueryHits,
  ALERT_ID_COLUMN,
  ALERT_ID_SUGGESTED_MAX,
} from './esql_query_utils';

export {
  ActionGroupId,
  ConditionMetAlertInstanceId,
  ES_QUERY_MAX_HITS_PER_EXECUTION,
  ES_QUERY_MAX_HITS_PER_EXECUTION_SERVERLESS,
} from './constants';
