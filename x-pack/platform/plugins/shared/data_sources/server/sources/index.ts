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
import { slackDataSource } from './slack';
import { jiraDataSource } from './jira-cloud';
import { firecrawlDataSource } from './firecrawl';
import { salesforceDataSource } from './salesforce';
import { zoomDataSource } from './zoom';
import { zendeskDataSource } from './zendesk';
import { pagerdutyDataSource } from './pagerduty';
import { servicenowDataSource } from './servicenow';
import { tavilyDataSource } from './tavily';

export function registerDataSources(dataCatalog: DataCatalogPluginSetup) {
  dataCatalog.register(notionDataSource);
  dataCatalog.register(githubDataSource);
  dataCatalog.register(googleDriveDataSource);
  dataCatalog.register(sharepointOnlineDataSource);
  dataCatalog.register(slackDataSource);
  dataCatalog.register(jiraDataSource);
  dataCatalog.register(firecrawlDataSource);
  dataCatalog.register(salesforceDataSource);
  dataCatalog.register(zoomDataSource);
  dataCatalog.register(zendeskDataSource);
  dataCatalog.register(servicenowDataSource);
  dataCatalog.register(pagerdutyDataSource);
  dataCatalog.register(tavilyDataSource);
}
