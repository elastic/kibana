/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';

import apm from 'elastic-apm-node';

import { compact } from 'lodash';
import pMap from 'p-map';
import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { MessageSigningError } from '../../common/errors';

import { AUTO_UPDATE_PACKAGES, FLEET_SETUP_LOCK_TYPE } from '../../common/constants';
import type { PreconfigurationError } from '../../common/constants';
import type { DefaultPackagesInstallationError, FleetSetupLock } from '../../common/types';

import { MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS } from '../constants';

import { appContextService } from './app_context';
import { ensurePreconfiguredPackagesAndPolicies } from './preconfiguration';
import {
  ensurePreconfiguredOutputs,
  getPreconfiguredOutputFromConfig,
} from './preconfiguration/outputs';
import {
  ensurePreconfiguredFleetProxies,
  getPreconfiguredFleetProxiesFromConfig,
} from './preconfiguration/fleet_proxies';
import { outputService } from './output';
import { downloadSourceService } from './download_source';

import { getRegistryUrl, settingsService } from '.';
import { awaitIfPending } from './setup_utils';
import {
  ensureFleetEventIngestedPipelineIsInstalled,
  ensureFleetFinalPipelineIsInstalled,
} from './epm/elasticsearch/ingest_pipeline/install';
import { ensureDefaultComponentTemplates } from './epm/elasticsearch/template/install';
import { getInstallations, reinstallPackageForInstallation } from './epm/packages';
import { isPackageInstalled } from './epm/packages/install';
import type { UpgradeManagedPackagePoliciesResult } from './setup/managed_package_policies';
import { setupUpgradeManagedPackagePolicies } from './setup/managed_package_policies';
import { upgradePackageInstallVersion } from './setup/upgrade_package_install_version';
import { upgradeAgentPolicySchemaVersion } from './setup/upgrade_agent_policy_schema_version';
import { migrateSettingsToFleetServerHost } from './fleet_server_host';
import {
  ensurePreconfiguredFleetServerHosts,
  getPreconfiguredFleetServerHostFromConfig,
} from './preconfiguration/fleet_server_host';
import { cleanUpOldFileIndices } from './setup/clean_old_fleet_indices';
import type { UninstallTokenInvalidError } from './security/uninstall_token_service';
import { ensureAgentPoliciesFleetServerKeysAndPolicies } from './setup/fleet_server_policies_enrollment_keys';
import { ensureSpaceSettings } from './preconfiguration/space_settings';
import {
  ensureDeleteUnenrolledAgentsSetting,
  getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig,
} from './preconfiguration/delete_unenrolled_agent_setting';
import { backfillPackagePolicySupportsAgentless } from './backfill_agentless';
import { updateDeprecatedComponentTemplates } from './setup/update_deprecated_component_templates';
import { createOrUpdateFleetSyncedIntegrationsIndex } from './setup/fleet_synced_integrations';

export interface SetupStatus {
  isInitialized: boolean;
  nonFatalErrors: Array<
    | PreconfigurationError
    | DefaultPackagesInstallationError
    | UpgradeManagedPackagePoliciesResult
    | UninstallTokenInvalidError
    | { error: MessageSigningError }
  >;
}

export async function setupFleet(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: {
    useLock: boolean;
  } = { useLock: false }
): Promise<SetupStatus> {
  const t = apm.startTransaction('fleet-setup', 'fleet');
  let created = false;
  try {
    if (options.useLock) {
      const { created: isCreated, toReturn } = await createLock(soClient);
      created = isCreated;
      if (toReturn) return toReturn;
    }
    return await awaitIfPending(async () => createSetupSideEffects(soClient, esClient));
  } catch (error) {
    apm.captureError(error);
    t.setOutcome('failure');
    throw error;
  } finally {
    t.end();
    // only delete lock if it was created by this instance
    if (options.useLock && created) {
      await deleteLock(soClient);
    }
  }
}

async function createLock(
  soClient: SavedObjectsClientContract
): Promise<{ created: boolean; toReturn?: SetupStatus }> {
  const logger = appContextService.getLogger();
  let created;
  try {
    // check if fleet setup is already started
    const fleetSetupLock = await soClient.get<FleetSetupLock>(
      FLEET_SETUP_LOCK_TYPE,
      FLEET_SETUP_LOCK_TYPE
    );

    const LOCK_TIMEOUT = 60 * 60 * 1000; // 1 hour

    // started more than 1 hour ago, delete previous lock
    if (
      fleetSetupLock.attributes.started_at &&
      new Date(fleetSetupLock.attributes.started_at).getTime() < Date.now() - LOCK_TIMEOUT
    ) {
      await deleteLock(soClient);
    } else {
      logger.info('Fleet setup already in progress, abort setup');
      return { created: false, toReturn: { isInitialized: false, nonFatalErrors: [] } };
    }
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      logger.debug('Fleet setup lock does not exist, continue setup');
    }
  }

  try {
    created = await soClient.create<FleetSetupLock>(
      FLEET_SETUP_LOCK_TYPE,
      {
        status: 'in_progress',
        uuid: uuidv4(),
        started_at: new Date().toISOString(),
      },
      { id: FLEET_SETUP_LOCK_TYPE }
    );
    if (logger.isLevelEnabled('debug')) {
      logger.debug(`Fleet setup lock created: ${JSON.stringify(created)}`);
    }
  } catch (error) {
    logger.info(`Could not create fleet setup lock, abort setup: ${error}`);
    return { created: false, toReturn: { isInitialized: false, nonFatalErrors: [] } };
  }
  return { created: !!created };
}

async function deleteLock(soClient: SavedObjectsClientContract) {
  const logger = appContextService.getLogger();
  try {
    await soClient.delete(FLEET_SETUP_LOCK_TYPE, FLEET_SETUP_LOCK_TYPE, { refresh: true });
    logger.debug(`Fleet setup lock deleted`);
  } catch (error) {
    // ignore 404 errors
    if (error.statusCode !== 404) {
      logger.error('Could not delete fleet setup lock', error);
    }
  }
}

async function createSetupSideEffects(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
): Promise<SetupStatus> {
  const logger = appContextService.getLogger();
  logger.info('Beginning fleet setup');

  await cleanUpOldFileIndices(esClient, logger);

  await ensureFleetDirectories();

  const { agentPolicies: policiesOrUndefined, packages: packagesOrUndefined } =
    appContextService.getConfig() ?? {};
  const policies = policiesOrUndefined ?? [];
  let packages = packagesOrUndefined ?? [];

  logger.debug('Setting Fleet server config');
  await migrateSettingsToFleetServerHost(soClient);
  logger.debug('Setting up Fleet download source');
  const defaultDownloadSource = await downloadSourceService.ensureDefault(soClient);
  // Need to be done before outputs and fleet server hosts as these object can reference a proxy
  logger.debug('Setting up Proxy');
  await ensurePreconfiguredFleetProxies(
    soClient,
    esClient,
    getPreconfiguredFleetProxiesFromConfig(appContextService.getConfig())
  );

  logger.debug('Setting up Fleet Sever Hosts');
  await ensurePreconfiguredFleetServerHosts(
    soClient,
    esClient,
    getPreconfiguredFleetServerHostFromConfig(appContextService.getConfig())
  );

  logger.debug('Setting up Space settings');
  await ensureSpaceSettings(appContextService.getConfig()?.spaceSettings ?? []);

  logger.debug('Setting up delete unenrolled agents setting');
  await ensureDeleteUnenrolledAgentsSetting(
    soClient,
    getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig(appContextService.getConfig())
  );

  logger.debug('Setting up Fleet outputs');
  await Promise.all([
    ensurePreconfiguredOutputs(
      soClient,
      esClient,
      getPreconfiguredOutputFromConfig(appContextService.getConfig())
    ),
    settingsService.settingsSetup(soClient),
  ]);

  const defaultOutput = await outputService.ensureDefaultOutput(soClient, esClient);

  logger.debug('Backfilling output performance presets');
  await outputService.backfillAllOutputPresets(soClient, esClient);

  logger.debug('Setting up Fleet Elasticsearch assets');
  let stepSpan = apm.startSpan('Install Fleet global assets', 'preconfiguration');
  await ensureFleetGlobalEsAssets(soClient, esClient);
  stepSpan?.end();

  // Ensure that required packages are always installed even if they're left out of the config
  const preconfiguredPackageNames = new Set(packages.map((pkg) => pkg.name));

  const autoUpdateablePackages = compact(
    await Promise.all(
      AUTO_UPDATE_PACKAGES.map((pkg) =>
        isPackageInstalled({
          savedObjectsClient: soClient,
          pkgName: pkg.name,
        }).then((installed) => (installed ? pkg : undefined))
      )
    )
  );

  packages = [
    ...packages,
    ...autoUpdateablePackages.filter((pkg) => !preconfiguredPackageNames.has(pkg.name)),
  ];

  logger.debug('Setting up initial Fleet packages');

  stepSpan = apm.startSpan('Install preconfigured packages and policies', 'preconfiguration');
  const { nonFatalErrors: preconfiguredPackagesNonFatalErrors } =
    await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      policies,
      packages,
      defaultOutput,
      defaultDownloadSource,
      DEFAULT_SPACE_ID
    );
  stepSpan?.end();

  stepSpan = apm.startSpan('Upgrade managed package policies', 'preconfiguration');
  await setupUpgradeManagedPackagePolicies(soClient, esClient);
  stepSpan?.end();

  logger.debug('Upgrade Fleet package install versions');
  stepSpan = apm.startSpan('Upgrade package install format version', 'preconfiguration');
  await upgradePackageInstallVersion({ soClient, esClient, logger });
  stepSpan?.end();

  logger.debug('Generating key pair for message signing');
  stepSpan = apm.startSpan('Configure message signing', 'preconfiguration');
  if (!appContextService.getMessageSigningService()?.isEncryptionAvailable) {
    logger.warn(
      'xpack.encryptedSavedObjects.encryptionKey is not configured, private key passphrase is being stored in plain text'
    );
  }
  let messageSigningServiceNonFatalError: { error: MessageSigningError } | undefined;
  try {
    await appContextService.getMessageSigningService()?.generateKeyPair();
  } catch (error) {
    if (error instanceof MessageSigningError) {
      messageSigningServiceNonFatalError = { error };
    } else {
      throw error;
    }
  }
  stepSpan?.end();

  stepSpan = apm.startSpan('Upgrade agent policy schema', 'preconfiguration');

  logger.debug('Upgrade Agent policy schema version');
  await upgradeAgentPolicySchemaVersion(soClient);
  stepSpan?.end();

  stepSpan = apm.startSpan('Set up enrollment keys for preconfigured policies', 'preconfiguration');
  logger.debug(
    'Setting up Fleet enrollment keys and verifying fleet server policies are not out-of-sync'
  );
  await ensureAgentPoliciesFleetServerKeysAndPolicies({ soClient, esClient, logger });
  stepSpan?.end();

  logger.debug('Backfilling package policy supports_agentless field');
  await backfillPackagePolicySupportsAgentless(esClient);

  logger.debug('Update deprecated _source.mode in component templates');
  await updateDeprecatedComponentTemplates(esClient);

  logger.debug('Create or update fleet-synced-integrations index');
  await createOrUpdateFleetSyncedIntegrationsIndex(esClient);

  const nonFatalErrors = [
    ...preconfiguredPackagesNonFatalErrors,
    ...(messageSigningServiceNonFatalError ? [messageSigningServiceNonFatalError] : []),
  ];

  if (nonFatalErrors.length > 0) {
    logger.info('Encountered non fatal errors during Fleet setup');
    formatNonFatalErrors(nonFatalErrors)
      .map((e) => JSON.stringify(e))
      .forEach((error) => {
        logger.info(error);
        apm.captureError(error);
      });
  }

  logger.info('Fleet setup completed');

  return {
    isInitialized: true,
    nonFatalErrors,
  };
}

/**
 * Ensure ES assets shared by all Fleet index template are installed
 */
export async function ensureFleetGlobalEsAssets(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const logger = appContextService.getLogger();
  // Ensure Global Fleet ES assets are installed
  logger.debug('Creating Fleet component template and ingest pipeline');
  const globalAssetsRes = await Promise.all([
    ensureDefaultComponentTemplates(esClient, logger), // returns an array
    ensureFleetFinalPipelineIsInstalled(esClient, logger),
    ensureFleetEventIngestedPipelineIsInstalled(esClient, logger),
  ]);
  const assetResults = globalAssetsRes.flat();
  if (assetResults.some((asset) => asset.isCreated)) {
    // Update existing index template
    const installedPackages = await getInstallations(soClient);
    await pMap(
      installedPackages.saved_objects,
      async ({ attributes: installation }) => {
        await reinstallPackageForInstallation({
          soClient,
          esClient,
          installation,
        }).catch((err) => {
          apm.captureError(err);
          logger.error(
            `Package needs to be manually reinstalled ${installation.name} after installing Fleet global assets: ${err.message}`
          );
        });
      },
      { concurrency: MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS }
    );
  }
}

/**
 * Maps the `nonFatalErrors` object returned by the setup process to a more readable
 * and predictable format suitable for logging output or UI presentation.
 */
export function formatNonFatalErrors(
  nonFatalErrors: SetupStatus['nonFatalErrors']
): Array<{ name: string; message: string }> {
  return nonFatalErrors.flatMap((e) => {
    if ('error' in e) {
      return {
        name: e.error.name,
        message: e.error.message,
      };
    } else if ('errors' in e) {
      return e.errors.map((upgradePackagePolicyError: any) => {
        if (typeof upgradePackagePolicyError === 'string') {
          return {
            name: 'SetupNonFatalError',
            message: upgradePackagePolicyError,
          };
        }

        return {
          name: upgradePackagePolicyError.key,
          message: upgradePackagePolicyError.message,
        };
      });
    }
  });
}

/**
 * Confirm existence of various directories used by Fleet and warn if they don't exist
 */
export async function ensureFleetDirectories() {
  const logger = appContextService.getLogger();
  const config = appContextService.getConfig();

  const bundledPackageLocation = config?.developer?.bundledPackageLocation;
  const registryUrl = getRegistryUrl();

  if (!bundledPackageLocation) {
    logger.warn('xpack.fleet.developer.bundledPackageLocation is not configured');
    return;
  }

  try {
    await fs.stat(bundledPackageLocation);
    logger.debug(`Bundled package directory ${bundledPackageLocation} exists`);
  } catch (error) {
    logger.warn(
      `Bundled package directory ${bundledPackageLocation} does not exist. All packages will be sourced from ${registryUrl}.`
    );
  }
}
