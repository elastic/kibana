/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCredentialWithAuth } from '../../../../lib/get_axios_instance';
import { isSystemAction } from '../../../../lib/is_system_action';
import type { ActionsClientContext } from '../../../../actions_client';
import { getConnectorAuth } from '../../lib/get_connector_auth';
import type { GetConnectorCredentialsOptions, ResolvedConnectorCredentials } from './types';

/** Returns execute-authorized connector config and auth headers without exposing stored secrets. */
export async function getConnectorCredentials(
  context: ActionsClientContext,
  { id: connectorId }: GetConnectorCredentialsOptions
): Promise<ResolvedConnectorCredentials> {
  const { actionTypeId, actionType, authMode, config, validatedSecrets, profileUid } =
    await getConnectorAuth(context, connectorId);

  if (isSystemAction(context, connectorId) || actionType.isSystemActionType) {
    throw new Error(
      `Unable to get connector credentials for ${actionTypeId}: system connectors are not supported`
    );
  }

  const getCredential = getCredentialWithAuth({
    authTypeRegistry: context.authTypeRegistry,
    configurationUtilities: context.actionTypeRegistry.getUtils(),
    logger: context.logger,
  });

  const headers = await getCredential({
    connectorId,
    secrets: validatedSecrets,
    connectorTokenClient: context.connectorTokenClient,
    authMode,
    profileUid,
  }).getAuthHeaders();

  return {
    connectorId,
    actionTypeId,
    config,
    headers,
  };
}
