/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '@kbn/data-catalog-plugin';
import { i18n } from '@kbn/i18n';

export const jiraDataCenterDataSource: DataSource = {
  id: 'jira-data-center',
  name: 'Jira Data Center',
  description: i18n.translate('xpack.dataSources.jiraDataCenter.description', {
    defaultMessage: 'Connect to Jira Data Center to pull data from your project.',
  }),

  iconType: '.jira-data-center',

  stackConnector: {
    type: '.jira-data-center',
    config: {},
  },

  workflows: {
    directory: __dirname + '/workflows',
  },
};
