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
import { getAuthMode } from './get_auth_mode';

export const getInMemoryConnectorAuthType = (connector: InMemoryConnector): string | undefined => {
  const authType = connector.secrets.authType ?? connector.config.authType;
  return typeof authType === 'string' ? authType : undefined;
};

export function connectorFromInMemoryConnector({
  id,
  inMemoryConnector,
  actionTypeRegistry,
}: {
  id: string;
  inMemoryConnector: InMemoryConnector;
  actionTypeRegistry: ActionTypeRegistry;
}): Connector {
  const authType = getInMemoryConnectorAuthType(inMemoryConnector);
  const connector: Connector = {
    id,
    actionTypeId: inMemoryConnector.actionTypeId,
    name: inMemoryConnector.name,
    isPreconfigured: inMemoryConnector.isPreconfigured,
    isSystemAction: inMemoryConnector.isSystemAction,
    isDeprecated: isConnectorDeprecated(inMemoryConnector),
    isConnectorTypeDeprecated: actionTypeRegistry.isDeprecated(inMemoryConnector.actionTypeId),
    authMode: getAuthMode(inMemoryConnector.authMode),
    ...(authType !== undefined ? { authType } : {}),
  };

  if (inMemoryConnector.exposeConfig) {
    connector.config = inMemoryConnector.config;
  }
  return connector;
}
