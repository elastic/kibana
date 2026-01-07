/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { join } from 'path';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/server';
import { EARSSupportedOAuthProvider } from '@kbn/data-sources-registry-plugin/server/data_catalog/data_type';

/**
 * EXAMPLE: GitHub data source using the new workflowsDir approach
 *
 * This is an example showing how to migrate from generateWorkflows() to workflowsDir.
 * To use this approach:
 * 1. Create a 'workflows' directory next to this file
 * 2. Add your workflow YAML files to that directory
 * 3. Use .tool.yaml suffix for workflows that should generate Agent Builder tools
 * 4. Use {{stackConnectorId}} as a template variable in your YAML files
 * 5. Remove the old generateWorkflows() method and workflows.ts file
 */
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
    oauthBaseUrl: 'https://localhost:8052',
  },

  stackConnector: {
    type: '.github',
    config: {},
  },

  // New approach: specify the directory containing workflow YAML files
  // The directory path should be absolute or relative to this file
  workflowsDir: join(__dirname, 'workflows'),
};