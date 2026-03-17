/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const githubMcpDataSource: DataSource = {
  id: 'github-mcp',
  name: 'Github (MCP)',
  description: i18n.translate('xpack.dataSources.githubMcp.description', {
    defaultMessage:
      'Connect to GitHub via the Copilot MCP server to search and read repositories, issues, and pull requests.',
  }),

  iconType: '.github',

  stackConnectors: [
    {
      type: '.github_mcp',
      config: {
        serverUrl: 'https://api.githubcopilot.com/mcp/',
      },
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
