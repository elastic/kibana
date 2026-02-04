/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSourceUIConfig } from './types';
import { createGitHubToMcpSerializer, createMcpToGitHubDeserializer } from './serializers/github';

/**
 * UI configuration for GitHub data sources.
 *
 * Provides a branded GitHub form experience while using .mcp connector APIs.
 * The form shows only the token field, hiding MCP implementation details from users.
 */
export const githubUIConfig: DataSourceUIConfig = {
  dataSourceId: 'github',
  uiOverride: {
    formComponentImport: () => import('../../components/branded_forms/github_datasource_form'),
    serializer: createGitHubToMcpSerializer(),
    deserializer: createMcpToGitHubDeserializer(),
    displayName: i18n.translate('xpack.dataSources.githubUIConfig.displayName', {
      defaultMessage: 'GitHub',
    }),
    selectMessage: i18n.translate('xpack.dataSources.githubUIConfig.selectMessage', {
      defaultMessage: 'Connect to GitHub to access your repositories and pull requests',
    }),
    iconClass: 'logoGithub',
  },
};
