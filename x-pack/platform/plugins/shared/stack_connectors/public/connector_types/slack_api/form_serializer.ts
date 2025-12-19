/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema, InternalConnectorForm } from '@kbn/alerts-ui-shared';

export const serializer = (data: InternalConnectorForm): ConnectorFormSchema => {
  const formAllowedChannels = (data.config?.allowedChannels as string[]) ?? [];
  const allowedChannels = formAllowedChannels.map((option) => ({ name: option })) ?? [];

  return {
    ...data,
    config: { ...data.config, allowedChannels },
  };
};
