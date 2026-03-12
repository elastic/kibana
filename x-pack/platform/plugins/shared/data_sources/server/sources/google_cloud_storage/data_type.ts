/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const googleCloudStorageDataSource: DataSource = {
  id: 'google_cloud_storage',
  name: 'Google Cloud Storage',
  description: i18n.translate('xpack.dataSources.googleCloudStorage.description', {
    defaultMessage: 'Connect to Google Cloud Storage to search and access objects in buckets.',
  }),
  iconType: '.google_cloud_storage',

  stackConnectors: [
    {
      type: '.google_cloud_storage',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
