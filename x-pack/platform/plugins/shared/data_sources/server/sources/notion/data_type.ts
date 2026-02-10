/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const notionDataSource: DataSource = {
  id: 'notion',
  name: 'Notion',
  description: i18n.translate('xpack.dataSources.notion.description', {
    defaultMessage: 'Connect to Notion to pull data from your workspace.',
  }),

  iconType: '.notion',

  stackConnector: {
    type: '.notion',
    config: {},
  },

  workflows: {
    directory: __dirname + '/workflows',
  },
};
