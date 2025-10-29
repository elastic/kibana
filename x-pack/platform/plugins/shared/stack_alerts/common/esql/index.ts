/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { EsqlTable, EsqlHit } from './esql_query_utils';
export {
  rowToDocument,
  transformToEsqlTable,
  getEsqlQueryHits,
  ALERT_ID_COLUMN,
} from './esql_query_utils';

export { ActionGroupId } from './constants';
