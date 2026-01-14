/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-sources-registry-plugin';
import { EARSSupportedOAuthProvider } from '@kbn/data-sources-registry-plugin';
import {
  generateGithubSearchIssuesWorkflow,
  generateGithubGetDocsWorkflow,
  generateGithubListRepositoriesWorkflow,
} from './workflows';

export const githubDataSource: DataSource = {
  id: 'github',
  name: 'Github',
  description: i18n.translate('xpack.dataSources.github.description', {
    defaultMessage: 'Connect to Github to pull data from your repository.',
  }),

  oauthConfiguration: {
    provider: EARSSupportedOAuthProvider.GITHUB,
    initiatePath: '/oauth/start/github',
    fetchSecretsPath: '/oauth/fetch_request_secrets',
    oauthBaseUrl: 'https://localhost:8052', // update once EARS deploys to QA
  },

  stackConnector: {
    type: '.github',
    config: {},
  },

  generateWorkflows(stackConnectorId: string) {
    return [
      { content: generateGithubSearchIssuesWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateGithubGetDocsWorkflow(stackConnectorId), shouldGenerateABTool: true },
      {
        content: generateGithubListRepositoriesWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
    ];
  },
};
