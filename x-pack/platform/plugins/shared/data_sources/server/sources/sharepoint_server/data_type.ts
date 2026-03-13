/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const sharepointServerDataSource: DataSource = {
  id: 'sharepoint-server',
  name: 'SharePoint Server',
  description: i18n.translate('xpack.dataSources.sharepointServer.description', {
    defaultMessage: 'Connect to SharePoint Server (on-premises) to search and retrieve content.',
  }),

  iconType: '.sharepoint-server',

  stackConnectors: [
    {
      type: '.sharepoint-server',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
