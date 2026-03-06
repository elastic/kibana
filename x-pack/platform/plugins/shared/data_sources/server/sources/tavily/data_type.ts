/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const tavilyDataSource: DataSource = {
  id: 'tavily',
  name: 'Tavily',
  description: i18n.translate('xpack.dataSources.tavily.description', {
    defaultMessage: 'Connect to Tavily to search the web and extract content from pages.',
  }),

  iconType: '.tavily',

  stackConnectors: [
    {
      type: '.mcp',
      config: {
        serverUrl: 'https://mcp.tavily.com/mcp/',
        hasAuth: true,
        authType: MCPAuthType.Bearer,
      },
      importedTools: [
        { name: 'tavily_search' },
        { name: 'tavily_extract' },
        { name: 'tavily_crawl' },
        { name: 'tavily_map' },
      ],
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
