/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

/**
 * Context7 data source — uses a dedicated v2 connector (.context7) to retrieve
 * up-to-date library documentation and code examples via the Context7 MCP server.
 *
 * Unlike generic MCP data sources that open the v1 .mcp connector config,
 * this data source ships a purpose-built v2 connector with typed actions
 * (resolveLibrary, queryDocs) and automatic MCP client lifecycle management.
 */
export const context7DataSource: DataSource = {
  id: 'context7',
  name: i18n.translate('xpack.dataSources.context7.name', {
    defaultMessage: 'Context7',
  }),
  description: i18n.translate('xpack.dataSources.context7.description', {
    defaultMessage:
      'Retrieve up-to-date documentation and code examples for any programming library via Context7.',
  }),

  iconType: '.context7',

  stackConnectors: [
    {
      type: '.context7',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
