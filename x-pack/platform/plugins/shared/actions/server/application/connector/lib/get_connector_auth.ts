/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthMode } from '@kbn/connector-specs';
import type { RawAction, ActionType } from '../../../types';
import { getActionKibanaPrivileges } from '../../../lib/get_action_kibana_privileges';
import { isPreconfigured } from '../../../lib/is_preconfigured';
import { isSystemAction } from '../../../lib/is_system_action';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../constants/saved_objects';
import type { ActionsClientContext } from '../../../actions_client';
import { validateSecrets } from '../../../lib';

export interface ResolvedConnectorAuth {
  connectorId: string;
  actionTypeId: string;
  actionType: ActionType;
  authMode?: AuthMode;
  config: Record<string, unknown>;
  validatedSecrets: Record<string, unknown>;
  profileUid?: string;
}

/** Authorizes execute access and loads decrypted, validated connector credentials in the current space. */
export async function getConnectorAuth(
  context: ActionsClientContext,
  connectorId: string,
  {
    onActionType,
  }: {
    onActionType?: (actionType: ActionType, actionTypeId: string) => void;
  } = {}
): Promise<ResolvedConnectorAuth> {
  const {
    actionTypeRegistry,
    authorization,
    encryptedSavedObjectsClient,
    inMemoryConnectors,
    isESOCanEncrypt,
    logger: log,
    request,
    spaces,
    unsecuredSavedObjectsClient,
    getCurrentUserProfileId,
  } = context;

  let actionTypeId: string | undefined;
  let authMode: AuthMode | undefined;
  let config: Record<string, unknown> = {};

  try {
    if (isPreconfigured(context, connectorId) || isSystemAction(context, connectorId)) {
      const connector = inMemoryConnectors.find(
        (inMemoryConnector) => inMemoryConnector.id === connectorId
      );

      actionTypeId = connector?.actionTypeId;
      authMode = connector?.authMode;
      config = (connector?.config ?? {}) as Record<string, unknown>;
    } else {
      const { attributes } = await unsecuredSavedObjectsClient.get<RawAction>(
        ACTION_SAVED_OBJECT_TYPE,
        connectorId
      );

      actionTypeId = attributes.actionTypeId;
      authMode = attributes.authMode;
      config = attributes.config ?? {};
    }
  } catch (err) {
    log.debug(`Failed to retrieve actionTypeId for action [${connectorId}]`, err);
    throw err;
  }

  const actionType = actionTypeRegistry.get(actionTypeId!);
  onActionType?.(actionType, actionTypeId!);

  await authorization.ensureAuthorized({
    operation: 'execute',
    additionalPrivileges: getActionKibanaPrivileges(context, actionTypeId),
    actionTypeId,
  });

  const inMemoryAction = inMemoryConnectors.find(
    (inMemoryConnector) => inMemoryConnector.id === connectorId
  );

  let secrets;

  if (inMemoryAction) {
    secrets = inMemoryAction.secrets;
    config = (inMemoryAction.config ?? config) as Record<string, unknown>;
  } else {
    if (!isESOCanEncrypt) {
      throw new Error(
        `Unable to retrieve connector secrets because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const spaceId = context.spaceId ?? (spaces && spaces.getSpaceId(request));
    const rawAction = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
      ACTION_SAVED_OBJECT_TYPE,
      connectorId,
      spaceId && spaceId !== 'default' ? { namespace: spaceId } : {}
    );

    secrets = rawAction.attributes.secrets;
    config = rawAction.attributes.config ?? config;
  }

  const configurationUtilities = actionTypeRegistry.getUtils();
  const validatedSecrets = validateSecrets(actionType, secrets, { configurationUtilities });

  const profileUid = await getCurrentUserProfileId?.(request);

  return {
    connectorId,
    actionTypeId: actionTypeId!,
    actionType,
    authMode,
    config,
    validatedSecrets,
    profileUid,
  };
}
