/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';
export const sharepointOnlineDataSource: DataSource = {
  id: 'sharepoint-online',
  name: 'SharePoint Online',
  description: i18n.translate('xpack.dataSources.sharepointOnline.description', {
    defaultMessage: 'Connect to SharePoint Online to search and retrieve site content.',
  }),

  iconType: '.sharepoint-online',

  stackConnectors: [
    {
      type: '.sharepoint-online',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
