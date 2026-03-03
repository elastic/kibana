/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '@kbn/data-catalog-plugin';
import { i18n } from '@kbn/i18n';

export const confluenceCloudDataSource: DataSource = {
  id: 'confluence-cloud',
  name: 'Confluence Cloud',
  description: i18n.translate('xpack.dataSources.confluenceCloud.description', {
    defaultMessage: 'Connect to Confluence Cloud to search and retrieve pages and spaces.',
  }),

  iconType: '.confluence-cloud',

  stackConnectors: [
    {
      type: '.confluence-cloud',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
