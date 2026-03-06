/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const zoomDataSource: DataSource = {
  id: 'zoom',
  name: 'Zoom',
  description: i18n.translate('xpack.dataSources.zoom.description', {
    defaultMessage:
      'Connect to Zoom to access meeting recordings, transcripts, chat logs, and participants.',
  }),

  iconType: '.zoom',

  stackConnectors: [
    {
      type: '.zoom',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
