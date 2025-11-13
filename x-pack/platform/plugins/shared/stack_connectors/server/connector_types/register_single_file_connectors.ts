/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-nocheck

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import {
  newSlackConnectorSchema,
  anotherConnectorSchema,
  mapToConnectorRegistration,
} from './single_file_connectors';

export function registerSingleFileConnectors({ actions }: { actions: ActionsPluginSetupContract }) {
  const registerConnector = (connector) => {
    actions.registerType(mapToConnectorRegistration(connector));
  };

  registerConnector(newSlackConnectorSchema);
  registerConnector(anotherConnectorSchema);
}
