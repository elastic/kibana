/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataCatalogPluginSetup } from '@kbn/data-catalog-plugin/server';
import { notionDataSource } from './notion';
import { githubDataSource } from './github';

export function registerDataSources(dataCatalog: DataCatalogPluginSetup) {
  dataCatalog.register(notionDataSource);
  dataCatalog.register(githubDataSource);
}
