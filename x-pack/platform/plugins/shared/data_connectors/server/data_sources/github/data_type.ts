/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/server';
import { EARSSupportedOAuthProvider } from '@kbn/data-sources-registry-plugin/server/data_catalog/data_type';
import {
  generateGithubSearchIssuesWorkflow,
  generateGithubGetDocsWorkflow,
  generateGithubListRepositoriesWorkflow,
  generateGithubSearchPullRequestsWorkflow,
  generateGithubGetIssueWorkflow,
  generateGithubGetPullRequestWorkflow,
  generateGithubGetFileContentsWorkflow,
  generateGithubListBranchesWorkflow,
  generateGithubSearchRepoContentsWorkflow,
  generateGithubGetDocWorkflow,
  generateGithubGetIssueCommentsWorkflow,
  generateGithubGetPullRequestCommentsWorkflow,
  generateGithubGetPullRequestFilesWorkflow,
} from './workflows';

export const githubDataSource: DataTypeDefinition = {
  id: 'github',
  name: 'Github',
  description: i18n.translate('xpack.dataConnectors.dataSources.github.description', {
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
      {
        content: generateGithubSearchPullRequestsWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubGetIssueWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubGetPullRequestWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubGetFileContentsWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubListBranchesWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubSearchRepoContentsWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubGetDocWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubGetIssueCommentsWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubGetPullRequestCommentsWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubGetPullRequestFilesWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
    ];
  },
};
