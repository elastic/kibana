/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Export constants
export { PLUGIN_ID, PLUGIN_NAME, API_BASE_PATH } from './constants';

// Export data source types for use by other plugins
export type {
  DataSource,
  StackConnectorConfig,
  EARSOAuthConfiguration,
  CustomOAuthConfiguration,
  WorkflowInfo,
} from './data_source_spec';

export { EARSSupportedOAuthProvider } from './data_source_spec';
