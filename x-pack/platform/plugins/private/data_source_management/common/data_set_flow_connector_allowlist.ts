/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Action type ids shown when creating a connector from the data sets flow.
 * Align with storage / warehouse-oriented data sources in datasource_types.ts.
 */
export const ESQL_EXTERNAL_DATA_SOURCE_ACTION_TYPE_ID = '.esql-external-data-source';

export const DATA_SET_FLOW_CONNECTOR_ACTION_TYPE_IDS: readonly string[] = [
  ESQL_EXTERNAL_DATA_SOURCE_ACTION_TYPE_ID,
  '.amazon_s3',
  '.azure-blob',
  '.google_cloud_storage',
  '.snowflake',
];
