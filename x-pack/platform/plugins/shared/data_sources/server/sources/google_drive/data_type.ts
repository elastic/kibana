/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const googleDriveDataSource: DataSource = {
  id: 'google_drive',
  name: 'Google Drive',
  description: i18n.translate('xpack.dataSources.googleDrive.description', {
    defaultMessage: 'Connect to Google Drive to access files and folders.',
  }),
  iconType: '.google_drive',

  stackConnectors: [
    {
      type: '.google_drive',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
