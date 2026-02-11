/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { SSL_SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../constants';
import { checkFleetServerVersionsForSecretsStorage } from '../fleet_server';
import { appContextService, settingsService } from '..';

export async function isSSLSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  const logger = appContextService.getLogger();

  // if serverless then secrets will always be supported
  const isFleetServerStandalone =
    appContextService.getConfig()?.internal?.fleetServerStandalone ?? false;

  if (isFleetServerStandalone) {
    logger.trace('SSL secrets storage is enabled as fleet server is standalone');
    return true;
  }

  // now check the flag in settings to see if the fleet server requirement has already been met
  // once the requirement has been met, secrets are always on
  const settings = await settingsService.getSettingsOrUndefined(soClient);

  if (settings && settings.ssl_secret_storage_requirements_met) {
    logger.debug('SSL secrets storage requirements already met, turned on in settings');
    return true;
  }

  // otherwise check if we have the minimum fleet server version and enable secrets if so
  if (
    await checkFleetServerVersionsForSecretsStorage(
      esClient,
      soClient,
      SSL_SECRETS_MINIMUM_FLEET_SERVER_VERSION
    )
  ) {
    logger.debug('Enabling SSL secrets storage as minimum fleet server version has been met');
    try {
      await settingsService.saveSettings(soClient, {
        ssl_secret_storage_requirements_met: true,
      });
    } catch (err) {
      // we can suppress this error as it will be retried on the next function call
      logger.warn(`Failed to save settings after enabling SSL secrets storage: ${err.message}`);
    }

    return true;
  }

  logger.info('Secrets storage is disabled as minimum fleet server version has not been met');
  return false;
}
