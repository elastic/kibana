/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema, InternalConnectorForm } from '@kbn/alerts-ui-shared';
import type { SlackApiConfig } from '@kbn/connector-schemas/slack_api';

export const deserializer = (data: ConnectorFormSchema): InternalConnectorForm => {
  const allowedChannels = (data.config?.allowedChannels as SlackApiConfig['allowedChannels']) ?? [];

  const formattedChannels =
    allowedChannels.map((channel) => {
      if (channel.name.startsWith('#')) {
        return channel;
      }

      return { ...channel, name: `#${channel.name}` };
    }) ?? [];

  return {
    ...data,
    config: { ...data.config, allowedChannels: formattedChannels },
  };
};
