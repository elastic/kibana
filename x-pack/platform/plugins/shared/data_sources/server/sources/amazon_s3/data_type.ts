/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const amazonS3DataSource: DataSource = {
  id: 'amazon_s3',
  name: 'Amazon S3',
  description: i18n.translate('xpack.dataSources.amazonS3.description', {
    defaultMessage: 'Connect to Amazon S3 to list buckets, objects and download files.',
  }),

  iconType: '.amazon_s3',

  stackConnectors: [
    {
      type: '.amazon_s3',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
