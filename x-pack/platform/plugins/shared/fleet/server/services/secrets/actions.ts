/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type {
  AgentAction,
  NewAgentAction,
  SecretReference,
  SOSecretPath,
} from '../../../common/types';
import { appContextService } from '../app_context';
import { settingsService } from '..';
import { checkFleetServerVersionsForSecretsStorage } from '../fleet_server';
import { ACTION_SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../constants';

import { deleteSOSecrets, extractAndWriteSOSecrets } from './common';

/**
 * Check if action secret storage is enabled.
 * Returns true if fleet server is standalone (serverless).
 * Otherwise, checks if the minimum fleet server version requirement has been met.
 * If the requirement has been met, updates the settings to enable action secret storage.
 */
export async function isActionSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  const logger = appContextService.getLogger();

  // if serverless then action secrets will always be supported
  const isFleetServerStandalone =
    appContextService.getConfig()?.internal?.fleetServerStandalone ?? false;

  if (isFleetServerStandalone) {
    logger.trace('Action secrets storage is enabled as fleet server is standalone');
    return true;
  }

  // now check the flag in settings to see if the fleet server requirement has already been met
  // once the requirement has been met, action secrets are always on
  const settings = await settingsService.getSettingsOrUndefined(soClient);

  if (settings && settings.action_secret_storage_requirements_met) {
    logger.debug('Action secrets storage requirements already met, turned on in settings');
    return true;
  }

  // otherwise check if we have the minimum fleet server version and enable secrets if so
  if (
    await checkFleetServerVersionsForSecretsStorage(
      esClient,
      soClient,
      ACTION_SECRETS_MINIMUM_FLEET_SERVER_VERSION
    )
  ) {
    logger.debug('Enabling action secrets storage as minimum fleet server version has been met');
    try {
      await settingsService.saveSettings(soClient, {
        action_secret_storage_requirements_met: true,
      });
    } catch (err) {
      // we can suppress this error as it will be retried on the next function call
      logger.warn(`Failed to save settings after enabling action secrets storage: ${err.message}`);
    }

    return true;
  }

  logger.info('Secrets storage is disabled as minimum fleet server version has not been met');
  return false;
}

/**
 * Given a new agent action, extracts the secrets, stores them in saved objects,
 * and returns the action with secrets replaced by references to the saved objects.
 */
export async function extractAndWriteActionSecrets(opts: {
  action: NewAgentAction;
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{ actionWithSecrets: NewAgentAction; secretReferences: SecretReference[] }> {
  const { action, esClient, secretHashes = {} } = opts;
  const secretPaths = getActionSecretPaths(action).filter((path) => typeof path.value === 'string');
  const secretRes = await extractAndWriteSOSecrets<NewAgentAction>({
    soObject: action,
    secretPaths,
    esClient,
    secretHashes,
  });
  return {
    actionWithSecrets: secretRes.soObjectWithSecrets,
    secretReferences: secretRes.secretReferences,
  };
}

/**
 * Deletes secrets for a given agent action.
 * This function is currently not used, but implemented for completeness.
 */
export async function deleteActionSecrets(opts: {
  action: AgentAction;
  esClient: ElasticsearchClient;
}): Promise<void> {
  const { action, esClient } = opts;
  await deleteSOSecrets(esClient, getActionSecretPaths(action));
}

/**
 * Helper function to get the secret paths for an agent action.
 */
function getActionSecretPaths(action: NewAgentAction): SOSecretPath[] {
  const secretPaths: SOSecretPath[] = [];

  if (action?.secrets?.user_info?.password) {
    secretPaths.push({
      path: 'secrets.user_info.password',
      value: action.secrets.user_info.password,
    });
  }
  if (action?.secrets?.enrollment_token) {
    secretPaths.push({
      path: 'secrets.enrollment_token',
      value: action.secrets.enrollment_token,
    });
  }

  return secretPaths;
}
