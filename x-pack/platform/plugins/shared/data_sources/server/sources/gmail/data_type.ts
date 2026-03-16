/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const gmailDataSource: DataSource = {
  id: 'gmail',
  name: 'Gmail',
  description: i18n.translate('xpack.dataSources.gmail.description', {
    defaultMessage: 'Connect to Gmail to search and read your emails.',
  }),
  iconType: '.gmail',

  stackConnectors: [
    {
      type: '.gmail',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
