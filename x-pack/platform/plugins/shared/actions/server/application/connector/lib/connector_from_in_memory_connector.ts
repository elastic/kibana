/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeRegistry } from '../../../action_type_registry';
import type { InMemoryConnector } from '../../../types';
import type { Connector } from '../types';
import { isConnectorDeprecated } from './is_connector_deprecated';

export function connectorFromInMemoryConnector({
  id,
  inMemoryConnector,
  actionTypeRegistry,
}: {
  id: string;
  inMemoryConnector: InMemoryConnector;
  actionTypeRegistry: ActionTypeRegistry;
}): Connector {
  const connector: Connector = {
    id,
    actionTypeId: inMemoryConnector.actionTypeId,
    name: inMemoryConnector.name,
    isPreconfigured: inMemoryConnector.isPreconfigured,
    isSystemAction: inMemoryConnector.isSystemAction,
    isDeprecated: isConnectorDeprecated(inMemoryConnector),
    isConnectorTypeDeprecated: actionTypeRegistry.isDeprecated(inMemoryConnector.actionTypeId),
  };

  if (inMemoryConnector.exposeConfig) {
    connector.config = inMemoryConnector.config;
  }
  return connector;
}
