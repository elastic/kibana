/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ActionTypeExecutorResult,
  ActionTypeRegistryContract,
  RawAction,
  Services,
} from '../types';
import { validateParams, validateConfig, validateSecrets } from './validate_with_schema';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';

interface ExecuteOptions {
  actionId: string;
  namespace?: string;
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
  // Ensure user can read the action before processing
  const {
    attributes: { actionTypeId, config, description },
  } = await services.savedObjectsClient.get<RawAction>('action', actionId);
  // Only get encrypted attributes here, the remaining attributes can be fetched in
  // the savedObjectsClient call
  const {
    attributes: { secrets },
  } = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<RawAction>('action', actionId, {
    namespace,
  });
  const actionType = actionTypeRegistry.get(actionTypeId);

  let validatedParams;
  let validatedConfig;
  let validatedSecrets;

  try {
    validatedParams = validateParams(actionType, params);
    validatedConfig = validateConfig(actionType, config);
    validatedSecrets = validateSecrets(actionType, secrets);
  } catch (err) {
    return { status: 'error', message: err.message, retry: false };
  }

  let result: ActionTypeExecutorResult | null = null;
  const actionLabel = `${actionId} - ${actionTypeId} - ${description}`;

  try {
    result = await actionType.executor({
      id: actionId,
      services,
      params: validatedParams,
      config: validatedConfig,
      secrets: validatedSecrets,
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
