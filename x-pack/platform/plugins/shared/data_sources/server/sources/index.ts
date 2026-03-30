/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataCatalogPluginSetup } from '@kbn/data-catalog-plugin/server';

// All data sources have been migrated to connector specs in @kbn/connector-specs.
// This function is now a no-op and will be removed along with the data_sources plugin.
export function registerDataSources(_dataCatalog: DataCatalogPluginSetup) {}
