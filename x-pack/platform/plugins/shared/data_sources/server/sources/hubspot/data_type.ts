/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const hubspotDataSource: DataSource = {
  id: 'hubspot',
  name: 'HubSpot',
  description: i18n.translate('xpack.dataSources.hubspot.description', {
    defaultMessage:
      'Connect to HubSpot to search and retrieve contacts, companies, deals, tickets, and engagements.',
  }),

  // Must map to an icon registered in @kbn/connector-specs ConnectorIconsMap
  iconType: '.hubspot',

  stackConnectors: [
    {
      type: '.hubspot',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
