/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const zendeskDataSource: DataSource = {
  id: 'zendesk',
  name: 'Zendesk',
  description: i18n.translate('xpack.dataSources.zendesk.description', {
    defaultMessage:
      'Connect to Zendesk to search and retrieve tickets, users, and Help Center content.',
  }),

  iconType: '.zendesk',

  stackConnectors: [
    {
      type: '.zendesk',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
