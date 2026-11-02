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
import { isSandboxCapableConnector } from '../../lib/is_sandbox_capable_connector';
import type { GetSandboxCredentialsOptions, ResolvedSandboxCredentials } from './types';

const getSelectedAuthTypeId = (secrets: Record<string, unknown>): string | undefined => {
  const { authType } = secrets;
  return typeof authType === 'string' && authType.length > 0 ? authType : undefined;
};

/** Merges header records case-insensitively; a later record wins and keeps its own key casing. */
const mergeHeaders = (...records: Array<Record<string, string>>): Record<string, string> => {
  const merged = new Map<string, [string, string]>();
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      merged.set(key.toLowerCase(), [key, value]);
    }
  }
  return Object.fromEntries(merged.values());
};

/** Returns sandbox-injectable connector config and auth headers without exposing stored secrets. */
export async function getSandboxCredentials(
  context: ActionsClientContext,
  { id: connectorId }: GetSandboxCredentialsOptions
): Promise<ResolvedSandboxCredentials> {
  const { actionTypeId, actionType, authMode, config, validatedSecrets, profileUid } =
    await getConnectorAuth(context, connectorId);

  if (isSystemAction(context, connectorId) || actionType.isSystemActionType) {
    throw new Error(
      `Unable to get sandbox credentials for ${actionTypeId}: system connectors are not supported`
    );
  }

  if (!context.actionTypeRegistry.isActionExecutable(connectorId, actionTypeId)) {
    context.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
  }

  if (
    !isSandboxCapableConnector({
      actionTypeId,
      config,
      secrets: validatedSecrets,
      actionTypeRegistry: context.actionTypeRegistry,
    })
  ) {
    const authTypeId = getSelectedAuthTypeId(validatedSecrets);
    throw new Error(
      `Unable to get sandbox credentials for ${actionTypeId}: auth type${
        authTypeId ? ` "${authTypeId}"` : ''
      } does not support sandbox`
    );
  }

  const configurationUtilities = context.actionTypeRegistry.getUtils();
  const getCredential = getCredentialWithAuth({
    authTypeRegistry: context.authTypeRegistry,
    configurationUtilities,
    logger: context.logger,
  });

  // Spec auth types produce headers via the registry. Stack connectors add their own
  // headers through the optional getSandboxAuthHeaders hook, which wins on conflict.
  const authHeaders = await getCredential({
    connectorId,
    connectorTypeId: actionTypeId,
    secrets: validatedSecrets,
    connectorTokenClient: context.connectorTokenClient,
    authMode,
    profileUid,
  }).getAuthHeaders();

  const headers = mergeHeaders(
    authHeaders,
    (await actionType.getSandboxAuthHeaders?.({
      config,
      secrets: validatedSecrets,
      connectorId,
      connectorTokenClient: context.connectorTokenClient,
      configurationUtilities,
      logger: context.logger,
    })) ?? {}
  );

  return {
    connectorId,
    actionTypeId,
    config,
    headers,
  };
}
