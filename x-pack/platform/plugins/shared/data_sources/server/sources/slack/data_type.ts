/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const slackDataSource: DataSource = {
  id: 'slack',
  name: 'Slack',
  description: i18n.translate('xpack.dataSources.slack.description', {
    defaultMessage:
      'Connect to Slack to list public channels, fetch message history, and send messages.',
  }),

  // Must map to an icon registered in @kbn/connector-specs ConnectorIconsMap
  iconType: '.slack2',

  // Slack data source uses a Stack Connector for execution.
  // We expect users to create/configure the stack connector via the connector flyout,
  // then the data source will reference that connector id.
  stackConnectors: [
    {
      type: '.slack2',
      config: {},
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
