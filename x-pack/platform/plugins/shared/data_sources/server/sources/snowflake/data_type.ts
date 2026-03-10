/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const snowflakeDataSource: DataSource = {
  id: 'snowflake',
  name: 'Snowflake',
  description: i18n.translate('xpack.dataSources.snowflake.description', {
    defaultMessage:
      'Connect to Snowflake to execute SQL queries and explore your data warehouse.',
  }),

  iconType: '.snowflake',

  stackConnectors: [
    {
      type: '.snowflake',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
