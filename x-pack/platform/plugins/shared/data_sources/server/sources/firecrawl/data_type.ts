/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { DataSource } from '@kbn/data-catalog-plugin';

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
        serverUrl: 'https://api.firecrawl.dev/mcp', // placeholder; update when Firecrawl MCP endpoint is known
        hasAuth: true,
        authType: MCPAuthType.Bearer,
      },
      importedTools: [],
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
