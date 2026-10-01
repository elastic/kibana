/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { BaseSettings } from '../../../common/types';
import { appContextService } from '..';
import { settingsService } from '..';

import { checkFleetServerVersionsForSecretsStorage } from '.';

export type FleetServerRequirementSettingsKey = Extract<
  keyof BaseSettings,
  | 'secret_storage_requirements_met'
  | 'output_secret_storage_requirements_met'
  | 'action_secret_storage_requirements_met'
  | 'ssl_secret_storage_requirements_met'
  | 'download_source_auth_secret_storage_requirements_met'
  | 'otlp_output_requirements_met'
>;

export interface FleetServerVersionRequirementOptions {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  featureName: string;
  minimumFleetServerVersion: string;
  settingKey: FleetServerRequirementSettingsKey;
}

/** Returns true when all enrolled Fleet Servers meet the given minimum version. */
export async function isFleetServerVersionRequirementMet(
  opts: FleetServerVersionRequirementOptions
): Promise<boolean> {
  const { esClient, soClient, featureName, minimumFleetServerVersion, settingKey } = opts;

  const logger = appContextService.getLogger();

  // Serverless / standalone deployments bundle Fleet Server — always met.
  const isFleetServerStandalone =
    appContextService.getConfig()?.internal?.fleetServerStandalone ?? false;

  if (isFleetServerStandalone) {
    logger.trace(`${featureName} is available: fleet server is standalone`);
    return true;
  }

  // Once the requirement has been met the latch is sticky — no re-check needed.
  const settings = await settingsService.getSettingsOrUndefined(soClient);

  if (settings && settings[settingKey]) {
    logger.debug(`${featureName} requirements already met, turned on in settings`);
    return true;
  }

  const areAllFleetServersOnProperVersion = await checkFleetServerVersionsForSecretsStorage(
    esClient,
    soClient,
    minimumFleetServerVersion
  );

  if (areAllFleetServersOnProperVersion) {
    logger.debug(
      `${featureName} is available: minimum Fleet Server version ${minimumFleetServerVersion} has been met`
    );
    try {
      await settingsService.saveSettings(soClient, {
        [settingKey]: true,
      });
    } catch (err) {
      // Suppress: the latch will be written on the next call.
      logger.warn(`Failed to save settings after enabling ${featureName}: ${err.message}`);
    }

    return true;
  }

  logger.info(
    `${featureName} is unavailable: minimum Fleet Server version ${minimumFleetServerVersion} has not been met`
  );
  return false;
}
