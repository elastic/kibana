/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { ApiKeysClient } from '@kbn/response-ops-api-keys';

import { connectorEventIdentityApiKeyName, type ConnectorEventIdentity } from './types';

export const invalidateConnectorEventIdentity = async ({
  identity,
  securityService,
  logger,
  connectorId,
}: {
  identity: ConnectorEventIdentity;
  securityService: SecurityServiceStart;
  logger: Logger;
  connectorId: string;
}): Promise<void> => {
  const name = connectorEventIdentityApiKeyName(connectorId);
  const apiKeys = new ApiKeysClient({ security: securityService, logger, pluginTag: 'actions' });
  await apiKeys.invalidateNow(identity, { subject: `connector event identity "${name}"` });
};
