/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataSourcesRegistryPluginSetup } from '@kbn/data-sources-registry-plugin/server';
import { notionDataSource } from './notion';

export function registerDataSources(dataSourcesRegistry: DataSourcesRegistryPluginSetup) {
  dataSourcesRegistry.register(notionDataSource);
}
