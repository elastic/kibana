/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/server';
import { EARSSupportedOAuthProvider } from '@kbn/data-sources-registry-plugin/server/data_catalog/data_type';

/**
 * EXAMPLE 1: Using Registry Workflows Only
 *
 * This example shows how to configure a data source to use workflows
 * from a third-party workflow registry instead of local files.
 */
export const githubDataSourceWithRegistry: DataTypeDefinition = {
  id: 'github',
  name: 'Github',
  description: i18n.translate('xpack.dataConnectors.dataSources.github.description', {
    defaultMessage: 'Connect to Github to pull data from your repository.',
  }),

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

  // Use workflows from a registry
  workflows: [
    {
      id: 'github-search-issues-v1',
      // shouldGenerateABTool defaults to what the registry specifies
    },
    {
      id: 'github-get-docs-v1',
    },
    {
      id: 'github-list-repos-v1',
    },
    {
      id: 'github-internal-sync',
      shouldGenerateABTool: false, // Override: don't generate AB tool for this one
    },
  ],
};

/**
 * EXAMPLE 2: Mixed Approach - Local + Registry
 *
 * Use registry workflows for common operations and local workflows
 * for Github-specific features.
 */
export const githubDataSourceMixed: DataTypeDefinition = {
  id: 'github',
  name: 'Github',
  description: i18n.translate('xpack.dataConnectors.dataSources.github.description', {
    defaultMessage: 'Connect to Github to pull data from your repository.',
  }),

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
    // Local Github-specific workflows
    directory: __dirname + '/workflows',

    // Common workflows from registry
    registry: [
      { id: 'common-search-v1' },
      { id: 'common-analytics-v1' },
    ],
  },
};

/**
 * EXAMPLE 3: Simple Local Directory (Recommended for most cases)
 *
 * This is the simplest and most common approach.
 */
export const githubDataSourceLocal: DataTypeDefinition = {
  id: 'github',
  name: 'Github',
  description: i18n.translate('xpack.dataConnectors.dataSources.github.description', {
    defaultMessage: 'Connect to Github to pull data from your repository.',
  }),

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

  // Simple: just point to the workflows directory
  workflows: __dirname + '/workflows',
};