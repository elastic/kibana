/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { API_KEY_URL_PLACEHOLDER, MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { DataSource } from '@kbn/data-catalog-plugin';

const FIRECRAWL_MCP_URL = `https://mcp.firecrawl.dev/${API_KEY_URL_PLACEHOLDER}/v2/mcp`;

export const firecrawlDataSource: DataSource = {
  id: 'firecrawl',
  name: 'Firecrawl',
  description: i18n.translate('xpack.dataSources.firecrawl.description', {
    defaultMessage: 'Connect to Firecrawl to crawl and scrape web content.',
  }),

  iconType: '.firecrawl',

  stackConnectors: [
    {
      type: '.mcp',
      config: {
        serverUrl: FIRECRAWL_MCP_URL,
        hasAuth: true,
        authType: MCPAuthType.ApiKeyInUrl,
      },
      preloadUrl: FIRECRAWL_MCP_URL,
      importedTools: [
        { name: 'firecrawl_scrape' },
        { name: 'firecrawl_batch_scrape' },
        { name: 'firecrawl_search' },
        { name: 'firecrawl_crawl' },
        { name: 'firecrawl_extract' },
      ],
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
