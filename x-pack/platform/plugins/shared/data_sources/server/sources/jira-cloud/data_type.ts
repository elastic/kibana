/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '@kbn/data-catalog-plugin';
import { i18n } from '@kbn/i18n';

export const jiraDataSource: DataSource = {
  id: 'jira',
  name: 'Jira Cloud',
  description: i18n.translate('xpack.dataSources.jira.description', {
    defaultMessage: 'Connect to Jira to pull data from your project.',
  }),

  iconType: '.jira-cloud',

  stackConnectors: [
    {
      type: '.jira-cloud',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
