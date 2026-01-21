/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { DataSource } from '@kbn/data-catalog-plugin';
import { EARSSupportedOAuthProvider } from '@kbn/data-catalog-plugin';
import {
  generateGithubSearchIssuesWorkflow,
  generateGithubSearchCodeWorkflow,
  generateGithubSearchPullRequestsWorkflow,
  generateGithubSearchRepositoriesWorkflow,
  generateGithubSearchUsersWorkflow,
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
    type: '.mcp',
    config: {
      serverUrl: 'https://api.githubcopilot.com/mcp/',
      hasAuth: true,
      authType: MCPAuthType.Bearer,
    },
    importedTools: [
      'get_commit',
      'get_file_contents',
      'get_label',
      'get_latest_release',
      'get_me',
      'get_tag',
      'get_team_members',
      'get_teams',
      'list_branches',
      'list_commits',
      'list_issue_types',
      'list_issues',
      'list_pull_requests',
      'list_releases',
      'list_tags',
      'pull_request_read',
    ],
  },

  generateWorkflows(stackConnectorId: string) {
    return [
      {
        content: generateGithubSearchIssuesWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubSearchCodeWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubSearchPullRequestsWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubSearchRepositoriesWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateGithubSearchUsersWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
    ];
  },
};
