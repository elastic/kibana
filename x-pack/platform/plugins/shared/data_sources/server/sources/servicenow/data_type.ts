/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const servicenowDataSource: DataSource = {
  id: 'servicenow',
  name: 'ServiceNow',
  description: i18n.translate('xpack.dataSources.servicenow.description', {
    defaultMessage: 'Connect to ServiceNow to search and retrieve records.',
  }),

  iconType: '.servicenow_search',

  stackConnector: {
    type: '.servicenow_search',
    config: {},
  },

  workflows: {
    directory: __dirname + '/workflows',
  },
};
