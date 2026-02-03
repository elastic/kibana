/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource, WorkflowInfo } from '@kbn/data-catalog-plugin';
import { EARSSupportedOAuthProvider } from '@kbn/data-catalog-plugin';
import { i18n } from '@kbn/i18n';

/**
 * Mixed Approach - Local + Registry
 *
 * Use registry workflows for common operations and local workflows
 * for Github-specific features.
 */
export const githubDataSourceWithNewWorkflows: DataSource = {
  id: 'github',
  name: 'Github',
  description: i18n.translate('xpack.dataConnectors.dataSources.github.description', {
    defaultMessage: 'Connect to Github to pull data from your repository.',
  }),

  iconType: '.github',

  oauthConfiguration: {
    provider: EARSSupportedOAuthProvider.GITHUB,
    initiatePath: '/oauth/start/github',
    fetchSecretsPath: '/oauth/fetch_request_secrets',
    oauthBaseUrl: 'https://localhost:8052',
  },

  stackConnector: {
    type: '.github',
    config: {},
  },

  // Mix local and registry workflows
  workflows: {
    directory: __dirname + '/workflows',
    registry: [{ id: 'common-search-v1' }, { id: 'common-analytics-v1', version: 'legacy' }],
  },

  generateWorkflows(stackConnectorId?: string): WorkflowInfo[] {
    return [];
  },
};
