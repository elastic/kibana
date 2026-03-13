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

  stackConnectors: [
    {
      type: '.mcp',
      config: {
        serverUrl: 'https://api.githubcopilot.com/mcp/',
        hasAuth: true,
        authType: MCPAuthType.Bearer,
      },
      // can add additional description to the tools here if needed
      importedTools: [
        { name: 'get_commit' },
        { name: 'get_label' },
        { name: 'get_latest_release' },
        { name: 'get_me' },
        { name: 'get_tag' },
        { name: 'get_team_members' },
        { name: 'get_teams' },
        { name: 'list_branches' },
        { name: 'list_commits' },
        { name: 'list_issue_types' },
        { name: 'list_issues' },
        { name: 'list_pull_requests' },
        { name: 'list_releases' },
        { name: 'list_tags' },
        { name: 'pull_request_read' },
      ],
    },
    {
      type: '.github',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
