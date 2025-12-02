/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/server';
import { SupportedOAuthProvider } from '@kbn/data-sources-registry-plugin/server/data_catalog/data_type';
import type {
  OAuthConfiguration,
  StackConnectorConfig,
  WorkflowInfo,
} from '@kbn/data-sources-registry-plugin/server/data_catalog/data_type';
import { generateQueryWorkflow, generateSearchWorkflow } from './workflows';

export class NotionDataSource implements DataTypeDefinition {
  readonly id = 'notion';
  readonly name = 'Notion';
  description = 'Connect to Notion to pull data from your workspace.';

  oauthConfiguration: OAuthConfiguration = {
    provider: SupportedOAuthProvider.NOTION,
    initiatePath: '/oauth/start/notion',
    fetchSecretsPath: '/oauth/fetch_request_secrets',
    oauthBaseUrl: 'https://localhost:8052',
  };

  stackConnector: StackConnectorConfig = {
    type: '.notion',
    config: {},
  };

  generateWorkflows(stackConnectorId: string): WorkflowInfo[] {
    return [
      { content: generateQueryWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateSearchWorkflow(stackConnectorId), shouldGenerateABTool: false },
    ];
  }
}
