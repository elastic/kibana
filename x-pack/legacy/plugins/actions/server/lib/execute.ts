/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Services, ActionTypeRegistryContract, ActionTypeExecutorResult } from '../types';
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
}: ExecuteOptions): Promise<ActionTypeExecutorResult> {
  // TODO: Ensure user can read the action before processing
  const action = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser('action', actionId, {
    namespace,
  });
  const actionType = actionTypeRegistry.get(action.attributes.actionTypeId);
  const mergedActionTypeConfig = {
    ...(action.attributes.actionTypeConfig || {}),
    ...(action.attributes.actionTypeConfigSecrets || {}),
  };

  let validatedConfig;
  let validatedParams;

  try {
    validatedConfig = validateActionTypeConfig(actionType, mergedActionTypeConfig);
    validatedParams = validateActionTypeParams(actionType, params);
  } catch (err) {
    return { status: 'error', message: err.message };
  }

  let result: ActionTypeExecutorResult | null = null;

  const { actionTypeId, description } = action.attributes;
  const actionLabel = `${actionId} - ${actionTypeId} - ${description}`;

  try {
    result = await actionType.executor({
      id: actionId,
      services,
      config: validatedConfig,
      params: validatedParams,
    });
  } catch (err) {
    services.log(
      ['warning', 'x-pack', 'actions'],
      `action executed unsuccessfully: ${actionLabel} - ${err.message}`
    );
    throw err;
  }

  services.log(['debug', 'x-pack', 'actions'], `action executed successfully: ${actionLabel}`);

  // return basic response if none provided
  if (result == null) return { status: 'ok' };

  return result;
}
