/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '@kbn/data-catalog-plugin';
import { i18n } from '@kbn/i18n';

export const firecrawlDataSource: DataSource = {
  id: 'firecrawl',
  name: 'Firecrawl',
  description: i18n.translate('xpack.dataSources.firecrawl.description', {
    defaultMessage: 'Connect to Firecrawl to scrape, search, map, and crawl the web.',
  }),

  iconType: '.firecrawl',

  stackConnectors: [
    {
      type: '.firecrawl',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
