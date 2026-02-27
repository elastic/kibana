/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const snowflakeDataSource: DataSource = {
  id: 'snowflake',
  name: 'Snowflake',
  description: i18n.translate('xpack.dataSources.snowflake.description', {
    defaultMessage:
      'Connect to Snowflake to query your data warehouse using Cortex AI and SQL tools.',
  }),

  iconType: '.snowflake',

  stackConnectors: [
    {
      type: '.mcp',
      config: {
        serverUrl:
          'https://<account>.snowflakecomputing.com/api/v2/databases/<db>/schemas/<schema>/mcp-servers/<server_name>',
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
