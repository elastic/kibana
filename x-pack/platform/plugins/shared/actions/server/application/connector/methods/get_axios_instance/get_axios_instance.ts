/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { RawAction } from '../../../../types';
import { getActionKibanaPrivileges } from '../../../../lib/get_action_kibana_privileges';
import { isPreconfigured } from '../../../../lib/is_preconfigured';
import { isSystemAction } from '../../../../lib/is_system_action';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import type { ActionsClientContext } from '../../../../actions_client';
import { validateSecrets } from '../../../../lib';

type ValidatedSecrets = Record<string, unknown>;

export type GetAxiosInstanceWithAuthFn = (secrets: ValidatedSecrets) => Promise<AxiosInstance>;

export async function getAxiosInstance(
  context: ActionsClientContext,
  actionId: string
): Promise<AxiosInstance> {
  const {
    actionTypeRegistry,
    authorization,
    encryptedSavedObjectsClient,
    getAxiosInstanceWithAuth,
    inMemoryConnectors,
    isESOCanEncrypt,
    logger: log,
    request,
    spaces,
    unsecuredSavedObjectsClient,
  } = context;

  let actionTypeId: string | undefined;
  let secrets;

  try {
    if (isPreconfigured(context, actionId) || isSystemAction(context, actionId)) {
      const connector = inMemoryConnectors.find(
        (inMemoryConnector) => inMemoryConnector.id === actionId
      );

      actionTypeId = connector?.actionTypeId;
    } else {
      const { attributes } = await unsecuredSavedObjectsClient.get<RawAction>(
        ACTION_SAVED_OBJECT_TYPE,
        actionId
      );

      actionTypeId = attributes.actionTypeId;
    }
  } catch (err) {
    log.debug(`Failed to retrieve actionTypeId for action [${actionId}]`, err);
    throw err;
  }

  await authorization.ensureAuthorized({
    operation: 'execute',
    additionalPrivileges: getActionKibanaPrivileges(context, actionTypeId),
    actionTypeId,
  });

  // check to see if it's in memory connector first
  const inMemoryAction = inMemoryConnectors.find(
    (inMemoryConnector) => inMemoryConnector.id === actionId
  );

  if (inMemoryAction) {
    secrets = inMemoryAction.secrets;
  } else {
    if (!isESOCanEncrypt) {
      throw new Error(
        `Unable to get axios instance action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const spaceId = spaces && spaces.getSpaceId(request);
    const rawAction = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
      'action',
      actionId,
      spaceId && spaceId !== 'default' ? { namespace: spaceId } : {}
    );

    secrets = rawAction.attributes.secrets;
  }

  const actionType = actionTypeRegistry.get(actionTypeId!);
  const configurationUtilities = actionTypeRegistry.getUtils();
  const validatedSecrets = validateSecrets(actionType, secrets, { configurationUtilities });

  return await getAxiosInstanceWithAuth(validatedSecrets);
}
