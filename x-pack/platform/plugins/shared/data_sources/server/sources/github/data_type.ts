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
import { generateGithubSearchWorkflow } from './workflows';

export const githubDataSource: DataSource = {
  id: 'github',
  name: 'Github',
  description: i18n.translate('xpack.dataSources.github.description', {
    defaultMessage: 'Connect to Github to pull data from your repository.',
  }),

  iconType: '.github',

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
      { name: 'get_commit', description: '' },
      {
        name: 'get_file_contents',
        description: 'Use this tool when wanting to download a file from github.',
      },
      { name: 'get_label', description: '' },
      { name: 'get_latest_release', description: '' },
      { name: 'get_me', description: '' },
      { name: 'get_tag', description: '' },
      { name: 'get_team_members', description: '' },
      { name: 'get_teams', description: '' },
      { name: 'list_branches', description: '' },
      { name: 'list_commits', description: '' },
      { name: 'list_issue_types', description: '' },
      { name: 'list_issues', description: '' },
      { name: 'list_pull_requests', description: '' },
      { name: 'list_releases', description: '' },
      { name: 'list_tags', description: '' },
      { name: 'pull_request_read', description: '' },
    ],
  },

  generateWorkflows(stackConnectorId: string) {
    return [
      {
        content: generateGithubSearchWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
    ];
  },
};
