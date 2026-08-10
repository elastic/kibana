/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorProvisioningPlugin as ConnectorProvisioningPluginClass } from './plugin';

export type { ConnectorProvisioningPluginSetup, ConnectorProvisioningPluginStart } from './types';

export const plugin = async () => {
  const { ConnectorProvisioningPlugin } = await import('./plugin');
  return new ConnectorProvisioningPlugin() as ConnectorProvisioningPluginClass;
};
