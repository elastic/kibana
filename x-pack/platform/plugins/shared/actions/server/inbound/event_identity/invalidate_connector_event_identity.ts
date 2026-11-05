/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

import {
  createActionsApiKeysClient,
  getConnectorEventIdentitySubject,
} from '../../api_keys/client';
import { connectorEventIdentityStorage } from '../../api_keys/storage';
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
  const subject = getConnectorEventIdentitySubject(connectorEventIdentityApiKeyName(connectorId));
  const apiKeys = createActionsApiKeysClient(securityService, logger);

  const failed = await apiKeys.invalidateNow(connectorEventIdentityStorage.read(identity), {
    subject,
  });
  if (failed.length > 0) {
    logger.warn(
      `API keys [${failed
        .map(({ apiKeyId }) => `"${apiKeyId}"`)
        .join(', ')}] for ${subject} could not be invalidated and will not be retried.`
    );
  }
};
