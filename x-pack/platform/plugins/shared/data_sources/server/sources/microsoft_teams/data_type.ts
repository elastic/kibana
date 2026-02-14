/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';
export const microsoftTeamsDataSource: DataSource = {
  id: 'microsoft-teams',
  name: 'Microsoft Teams',
  description: i18n.translate('xpack.dataSources.microsoftTeams.description', {
    defaultMessage:
      'Connect to Microsoft Teams to search messages and browse teams, channels, and chats.',
  }),

  iconType: '.microsoft-teams',

  stackConnector: {
    type: '.microsoft-teams',
    config: {},
  },

  workflows: {
    directory: __dirname + '/workflows',
  },
};
