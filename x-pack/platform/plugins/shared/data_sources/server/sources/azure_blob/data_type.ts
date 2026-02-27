/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '@kbn/data-catalog-plugin';
import { i18n } from '@kbn/i18n';

export const azureBlobDataSource: DataSource = {
  id: 'azure-blob',
  name: 'Azure Blob Storage',
  description: i18n.translate('xpack.dataSources.azureBlob.description', {
    defaultMessage: 'Connect to Azure Blob Storage to search and retrieve blobs.',
  }),

  iconType: '.azure-blob',

  stackConnectors: [
    {
      type: '.azure-blob',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
