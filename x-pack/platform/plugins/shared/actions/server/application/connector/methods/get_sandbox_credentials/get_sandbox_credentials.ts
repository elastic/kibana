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
import type { GetSandboxCredentialsOptions, ResolvedSandboxCredentials } from './types';

const getSelectedAuthTypeId = (secrets: Record<string, unknown>): string | undefined => {
  const { authType } = secrets;
  return typeof authType === 'string' && authType.length > 0 ? authType : undefined;
};

/** Normalizes secretHeaders from an object or the JSON string preconfigured connectors store. */
const normalizeSecretHeaders = (secretHeaders: unknown): Record<string, string> => {
  let record = secretHeaders;
  if (typeof record === 'string') {
    try {
      record = JSON.parse(record);
    } catch {
      return {};
    }
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') {
      headers[key] = value;
    }
  }
  return headers;
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

  const authTypeId = getSelectedAuthTypeId(validatedSecrets);
  const sandboxSupportedAuthTypes = actionType.sandboxSupportedAuthTypes ?? [];
  const connectorSupportsSandbox =
    actionType.isSandboxCapable?.({ config, secrets: validatedSecrets }) === true;
  const authTypeSupportsSandbox = Boolean(
    authTypeId && sandboxSupportedAuthTypes.includes(authTypeId)
  );

  if (!connectorSupportsSandbox && !authTypeSupportsSandbox) {
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

  // Spec auth types produce headers via the registry. Classic connectors (e.g. .http) often
  // store Authorization: ApiKey … in secretHeaders with secrets.authType unset (→ "none").
  const authHeaders = await getCredential({
    connectorId,
    secrets: validatedSecrets,
    connectorTokenClient: context.connectorTokenClient,
    authMode,
    profileUid,
  }).getAuthHeaders();

  const headers = {
    ...authHeaders,
    ...(await actionType.getSandboxAuthHeaders?.({
      config,
      secrets: validatedSecrets,
      connectorId,
      connectorTokenClient: context.connectorTokenClient,
      configurationUtilities,
      logger: context.logger,
    })),
    ...normalizeSecretHeaders(validatedSecrets.secretHeaders),
  };

  return {
    connectorId,
    actionTypeId,
    config,
    headers,
  };
}
