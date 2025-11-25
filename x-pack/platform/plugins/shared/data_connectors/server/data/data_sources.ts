/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataSourcesRegistryPluginSetup,
  DataTypeDefinition,
} from '@kbn/data-sources-registry-plugin/server';

export class NotionDataSource implements DataTypeDefinition {
  id: string;
  name: string;
  description?: string | undefined;

  constructor() {
    this.id = '.notion';
    this.name = 'Notion';
    this.description = 'Connect to Notion to pull data from your workspace.';
  }
}

export function registerDataSources(dataSourcesRegistry: DataSourcesRegistryPluginSetup) {
  const ds = new NotionDataSource();
  dataSourcesRegistry.register(ds);
}
