/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const salesforceDataSource: DataSource = {
  id: 'salesforce',
  name: 'Salesforce',
  description: i18n.translate('xpack.dataSources.salesforce.description', {
    defaultMessage: 'Connect to Salesforce to pull data from your Salesforce instance.',
  }),

  iconType: '.salesforce',

  stackConnectors: [
    {
      type: '.salesforce',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
