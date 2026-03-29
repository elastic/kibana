/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  DataSourceEntry,
  DataSourceType,
  DataSourceStats,
  DataSourceSemantic,
  FreshnessCategory,
  FieldMetadata,
  IntegrationMetadata,
  CatalogQueryParams,
  CatalogQueryResult,
} from './src/types';

export {
  CATALOG_INDEX_NAME,
  DEFAULT_FIELD_LIMIT,
  DEFAULT_SECURITY_PATTERNS,
  FRESHNESS_THRESHOLDS,
  CATALOG_VERSION,
} from './src/constants';

export { catalogIndexMapping } from './src/index_mapping';

export { CatalogClient } from './src/catalog_client';
export { CatalogQuery } from './src/catalog_query';
export { refreshCatalog } from './src/catalog_refresh';
export type { PackageClientLike } from './src/providers/integration_provider';
export { generateHeuristicSummary } from './src/providers/heuristic_summary_provider';
