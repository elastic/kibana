/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource, ConnectorReference } from '@kbn/data-catalog-plugin';
import { EARSSupportedOAuthProvider } from '@kbn/data-catalog-plugin';
import {
  generateGetDataSourceWorkflow,
  generateGetPageWorkflow,
  generateQueryWorkflow,
  generateSearchWorkflow,
} from './workflows';

export const notionDataSource: DataSource = {
  id: 'notion',
  name: 'Notion',
  description: i18n.translate('xpack.dataSources.notion.description', {
    defaultMessage: 'Connect to Notion to pull data from your workspace.',
  }),
  iconType: '.notion',

  oauthConfiguration: {
    provider: EARSSupportedOAuthProvider.NOTION,
    initiatePath: '/oauth/start/notion',
    fetchSecretsPath: '/oauth/fetch_request_secrets',
    oauthBaseUrl: 'https://localhost:8052',
  },

  stackConnectors: [
    {
      type: '.notion',
      config: {},
      role: 'primary',
      name: 'Notion',
      description: i18n.translate('xpack.dataSources.notion.connectorDescription', {
        defaultMessage: 'Connect to Notion to access pages, databases, and workspace content.',
      }),
    },
  ],

  generateWorkflows(connectors: ConnectorReference[]) {
    const notion = connectors.find((c) => c.type === '.notion');

    if (!notion) {
      throw new Error('Notion connector is required for Notion data source');
    }

    return [
      { content: generateQueryWorkflow(notion.id), shouldGenerateABTool: true },
      { content: generateSearchWorkflow(notion.id), shouldGenerateABTool: true },
      { content: generateGetPageWorkflow(notion.id), shouldGenerateABTool: true },
      { content: generateGetDataSourceWorkflow(notion.id), shouldGenerateABTool: true },
    ];
  },
};
