/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';
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

  oauthConfiguration: {
    provider: EARSSupportedOAuthProvider.NOTION,
    initiatePath: '/oauth/start/notion',
    fetchSecretsPath: '/oauth/fetch_request_secrets',
    oauthBaseUrl: 'https://localhost:8052',
  },

  stackConnector: {
    type: '.notion',
    config: {},
  },

  generateWorkflows(stackConnectorId: string) {
    return [
      { content: generateQueryWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSearchWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateGetPageWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateGetDataSourceWorkflow(stackConnectorId), shouldGenerateABTool: true },
    ];
  },
};
