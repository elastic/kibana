/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorType as getNotionStackConnector } from '@kbn/stack-connectors-plugin/server/connector_types/notion';
import type { NotionConfig, NotionSecrets } from '@kbn/stack-connectors-plugin/common/notion/types';
import type { ExtendedConnectorType } from '../types/extended_connector_type';

/**
 * Workflow template generators for Notion
 */
const workflowTemplates = {
  search: (stackConnectorId: string) => `version: '1'
name: 'Notion search'
description: 'Search for pages or data sources that contain a given string in the title'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query_string
    type: string
  - name: query_object
    type: choice
    options:
      - "page"
      - "data_source"
steps:
  - name: search-page-by-title
    type: notion.searchPageByTitle
    connector-id: ${stackConnectorId}
    with:
      query: "\${{inputs.query_string}}"
      queryObjectType: "\${{inputs.query_object}}"
`,

  queryDataSource: (stackConnectorId: string) => `version: '1'
name: 'Notion query data source'
description: 'Given the ID of a data source, query information about its rows'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: data_source_id
    type: string
  - name: filter_by
    type: string
    required: false
  - name: page_size
    type: number
    required: false
    default: 10
steps:
  - name: query-data-source
    type: notion.queryDataSource
    connector-id: ${stackConnectorId}
    with:
      dataSourceId: "\${{inputs.data_source_id}}"
      pageSize: \${{inputs.page_size}}
      filter: "\${{inputs.filter_by}}"
`,
};

/**
 * Get Notion connector with extended workplace metadata
 */
export function getNotionConnectorWithMetadata(): ExtendedConnectorType<
  NotionConfig,
  NotionSecrets
> {
  // Get the base connector from stack_connectors
  const baseConnector = getNotionStackConnector();

  // Extend it with workplace metadata
  return {
    ...baseConnector,
    workplaceMetadata: {
      oauth: {
        provider: 'notion',
        scopes: [],
        initiatePath: '/oauth/start/notion',
        fetchSecretsPath: '/oauth/fetch_request_secrets',
        oauthBaseUrl: 'https://localhost:8052',
      },
      workflowTemplates,
      toolGeneration: {
        enabled: true,
        toolConfigs: [
          {
            workflowId: 'search',
            toolName: 'notion_search',
            toolDescription: 'Search Notion pages and databases',
          },
          {
            workflowId: 'queryDataSource',
            toolName: 'notion_query_database',
            toolDescription: 'Query data from a Notion database',
          },
        ],
      },
      ui: {
        customFlyoutComponent: 'notion_connector_flyout',
        hideFromConnectorsList: false,
      },
      features: ['search', 'query', 'federated', 'workflows'],
    },
  };
}
