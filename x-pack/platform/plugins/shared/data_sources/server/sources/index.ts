/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataCatalogPluginSetup } from '@kbn/data-catalog-plugin/server';
import { notionDataSource } from './notion';
import { githubDataSource } from './github';
import { googleDriveDataSource } from './google_drive';
import { sharepointOnlineDataSource } from './sharepoint_online';
import { jiraDataSource } from './jira-cloud';

export const dataSources = [
  notionDataSource,
  githubDataSource,
  googleDriveDataSource,
  sharepointOnlineDataSource,
  jiraDataSource,
];

export function registerDataSources(dataCatalog: DataCatalogPluginSetup) {
  dataSources.forEach((ds) => dataCatalog.register(ds));
}
