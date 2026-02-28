/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const outlookDataSource: DataSource = {
  id: 'outlook',
  name: 'Outlook',
  description: i18n.translate('xpack.dataSources.outlook.description', {
    defaultMessage:
      'Connect to Microsoft Outlook to search and retrieve email messages via the Microsoft Graph API.',
  }),

  iconType: '.outlook',

  stackConnectors: [
    {
      type: '.outlook',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
