/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataCatalogPluginSetup } from '@kbn/data-catalog-plugin/server';
import { pagerdutyDataSource } from './pagerduty';
import { tavilyDataSource } from './tavily';

export function registerDataSources(dataCatalog: DataCatalogPluginSetup) {
  dataCatalog.register(pagerdutyDataSource);
  dataCatalog.register(tavilyDataSource);
}
