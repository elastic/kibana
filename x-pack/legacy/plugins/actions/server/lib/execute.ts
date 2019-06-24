/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Services, ActionTypeRegistryContract } from '../types';
import { validateActionTypeConfig } from './validate_action_type_config';
import { validateActionTypeParams } from './validate_action_type_params';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';

interface ExecuteOptions {
  actionId: string;
  namespace: string;
  services: Services;
  params: Record<string, any>;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
  actionTypeRegistry: ActionTypeRegistryContract;
}

export async function execute({
  actionId,
  namespace,
  actionTypeRegistry,
  services,
  params,
  encryptedSavedObjectsPlugin,
}: ExecuteOptions) {
  // TODO: Ensure user can read the action before processing
  const action = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser('action', actionId, {
    namespace,
  });
  const actionType = actionTypeRegistry.get(action.attributes.actionTypeId);
  const mergedActionTypeConfig = {
    ...(action.attributes.actionTypeConfig || {}),
    ...(action.attributes.actionTypeConfigSecrets || {}),
  };
  const validatedConfig = validateActionTypeConfig(actionType, mergedActionTypeConfig);
  const validatedParams = validateActionTypeParams(actionType, params);
  await actionType.executor({
    services,
    config: validatedConfig,
    params: validatedParams,
  });
}
