/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const mysqlDataSource: DataSource = {
  id: 'mysql',
  name: 'MySQL',
  description: i18n.translate('xpack.dataSources.mysql.description', {
    defaultMessage: 'Connect to MySQL to search and query your databases.',
  }),

  iconType: '.mysql',

  stackConnectors: [
    {
      type: '.mysql',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
