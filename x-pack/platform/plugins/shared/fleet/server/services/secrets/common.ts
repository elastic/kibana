/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { get, keyBy } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

import type {
  Secret,
  SOSecretPath,
  DeletedSecretResponse,
  DeletedSecretReference,
  BaseSettings,
} from '../../../common/types';
import type { SecretReference } from '../../types';
import { FleetError } from '../../errors';
import { SECRETS_ENDPOINT_PATH, SECRETS_MINIMUM_FLEET_SERVER_VERSION } from '../../constants';
import { retryTransientEsErrors } from '../epm/elasticsearch/retry';
import { auditLoggingService } from '../audit_logging';
import { appContextService } from '../app_context';
import { settingsService } from '..';
import { checkFleetServerVersionsForSecretsStorage } from '../fleet_server';

type SecretStorageSettingsKey = Extract<
  keyof BaseSettings,
  | 'secret_storage_requirements_met'
  | 'output_secret_storage_requirements_met'
  | 'action_secret_storage_requirements_met'
  | 'ssl_secret_storage_requirements_met'
  | 'download_source_auth_secret_storage_requirements_met'
>;

export interface SecretStorageCheckOptions {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  /**
   * A human-readable name for the feature (used in logging).
   * Defaults to "Secrets".
   */
  featureName?: string;
  /**
   * The minimum fleet server version required for this secret storage feature.
   * Defaults to SECRETS_MINIMUM_FLEET_SERVER_VERSION.
   */
  minimumFleetServerVersion?: string;
  /**
   * The setting key to check/update for this feature.
   * Defaults to 'secret_storage_requirements_met'.
   */
  settingKey?: SecretStorageSettingsKey;
}

export async function isSecretStorageEnabledForFeature(
  opts: SecretStorageCheckOptions
): Promise<boolean> {
  const {
    esClient,
    soClient,
    featureName = 'Secrets',
    minimumFleetServerVersion = SECRETS_MINIMUM_FLEET_SERVER_VERSION,
    settingKey = 'secret_storage_requirements_met',
  } = opts;

  const logger = appContextService.getLogger();

  // if serverless then secrets will always be supported
  const isFleetServerStandalone =
    appContextService.getConfig()?.internal?.fleetServerStandalone ?? false;

  if (isFleetServerStandalone) {
    logger.trace(`${featureName} storage is enabled as fleet server is standalone`);
    return true;
  }

  // now check the flag in settings to see if the fleet server requirement has already been met
  // once the requirement has been met, secrets are always on
  const settings = await settingsService.getSettingsOrUndefined(soClient);

  if (settings && settings[settingKey]) {
    logger.debug(`${featureName} storage requirements already met, turned on in settings`);
    return true;
  }

  const areAllFleetServersOnProperVersion = await checkFleetServerVersionsForSecretsStorage(
    esClient,
    soClient,
    minimumFleetServerVersion
  );

  // otherwise check if we have the minimum fleet server version and enable secrets if so
  if (areAllFleetServersOnProperVersion) {
    logger.debug(`Enabling ${featureName} storage as minimum fleet server version has been met`);
    try {
      await settingsService.saveSettings(soClient, {
        [settingKey]: true,
      });
    } catch (err) {
      // we can suppress this error as it will be retried on the next function call
      logger.warn(`Failed to save settings after enabling ${featureName} storage: ${err.message}`);
    }

    return true;
  }

  logger.info(
    `${featureName} storage is disabled as minimum fleet server version has not been met`
  );
  return false;
}

export async function isSecretStorageEnabled(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<boolean> {
  return isSecretStorageEnabledForFeature({
    esClient,
    soClient,
    featureName: 'Secrets',
    minimumFleetServerVersion: SECRETS_MINIMUM_FLEET_SERVER_VERSION,
    settingKey: 'secret_storage_requirements_met',
  });
}

export async function createSecrets(opts: {
  esClient: ElasticsearchClient;
  values: Array<string | string[]>;
}): Promise<Array<Secret | Secret[]>> {
  const { esClient, values } = opts;
  const logger = appContextService.getLogger();

  const sendESRequest = (value: string): Promise<Secret> => {
    return retryTransientEsErrors(
      () =>
        esClient.transport.request({
          method: 'POST',
          path: SECRETS_ENDPOINT_PATH,
          body: { value },
        }),
      { logger }
    );
  };

  const secretsResponse: Array<Secret | Secret[]> = await Promise.all(
    values.map(async (value) => {
      try {
        if (Array.isArray(value)) {
          return await Promise.all(value.map(sendESRequest));
        } else {
          return await sendESRequest(value);
        }
      } catch (err) {
        const msg = `Error creating secrets: ${err}`;
        logger.error(msg);
        throw new FleetError(msg);
      }
    })
  );

  const writeLog = (item: Secret) => {
    auditLoggingService.writeCustomAuditLog({
      message: `secret created: ${item.id}`,
      event: {
        action: 'secret_create',
        category: ['database'],
        type: ['access'],
        outcome: 'success',
      },
    });
  };

  secretsResponse.forEach((item) => {
    if (Array.isArray(item)) {
      item.forEach(writeLog);
    } else {
      writeLog(item);
    }
  });

  return secretsResponse;
}

export async function deleteSecrets(opts: {
  esClient: ElasticsearchClient;
  ids: string[];
}): Promise<void> {
  const { esClient, ids } = opts;
  const logger = appContextService.getLogger();

  const deletedRes: DeletedSecretReference[] = await Promise.all(
    ids.map(async (id) => {
      try {
        const getDeleteRes: DeletedSecretResponse = await retryTransientEsErrors(
          () =>
            esClient.transport.request({
              method: 'DELETE',
              path: `${SECRETS_ENDPOINT_PATH}/${id}`,
            }),
          { logger }
        );

        return { ...getDeleteRes, id };
      } catch (err) {
        const msg = `Error deleting secrets: ${err}`;
        logger.error(msg);
        throw new FleetError(msg);
      }
    })
  );

  deletedRes.forEach((item) => {
    if (item.deleted === true) {
      auditLoggingService.writeCustomAuditLog({
        message: `secret deleted: ${item.id}`,
        event: {
          action: 'secret_delete',
          category: ['database'],
          type: ['access'],
          outcome: 'success',
        },
      });
    }
  });
}

// this is how IDs are inserted into compiled templates
export function toCompiledSecretRef(id: string) {
  return `$co.elastic.secret{${id}}`;
}

/**
 * Given an array of secret paths, deletes the corresponding secrets
 */
export async function deleteSOSecrets(
  esClient: ElasticsearchClient,
  secretPaths: SOSecretPath[]
): Promise<void> {
  if (secretPaths.length === 0) {
    return Promise.resolve();
  }

  const secretIds = secretPaths.map(({ value }) => (value as { id: string }).id);

  try {
    return deleteSecrets({ esClient, ids: secretIds });
  } catch (err) {
    appContextService.getLogger().warn(`Error deleting secrets: ${err}`);
  }
}

/**
 * Takes a generic object T and its secret paths
 * Creates new secrets and returns the references
 */
export async function extractAndWriteSOSecrets<T>(opts: {
  soObject: T;
  esClient: ElasticsearchClient;
  secretPaths: SOSecretPath[];
  secretHashes?: Record<string, any>;
}): Promise<{ soObjectWithSecrets: T; secretReferences: SecretReference[] }> {
  const { soObject, esClient, secretPaths, secretHashes = {} } = opts;

  if (secretPaths.length === 0) {
    return { soObjectWithSecrets: soObject, secretReferences: [] };
  }

  const secrets = await createSecrets({
    esClient,
    values: secretPaths.map(({ value }) => value as string | string[]),
  });

  const objectWithSecretRefs = JSON.parse(JSON.stringify(soObject));
  secretPaths.forEach((secretPath, i) => {
    const pathWithoutPrefix = secretPath.path.replace('secrets.', '');
    const maybeHash = get(secretHashes, pathWithoutPrefix);
    const currentSecret = secrets[i];
    set(objectWithSecretRefs, secretPath.path, {
      ...(Array.isArray(currentSecret)
        ? { ids: currentSecret.map(({ id }) => id) }
        : { id: currentSecret.id }),
      ...(typeof maybeHash === 'string' && { hash: maybeHash }),
    });
  });

  return {
    soObjectWithSecrets: objectWithSecretRefs,
    secretReferences: secrets.reduce((acc: SecretReference[], secret) => {
      if (Array.isArray(secret)) {
        return [...acc, ...secret.map(({ id }) => ({ id }))];
      }
      return [...acc, { id: secret.id }];
    }, []),
  };
}

/**
 * Takes a generic object T to update and its old and new secret paths
 * Updates secrets and returns the references
 */
export async function extractAndUpdateSOSecrets<T>(opts: {
  updatedSoObject: Partial<T>;
  oldSecretPaths: SOSecretPath[];
  updatedSecretPaths: SOSecretPath[];
  esClient: ElasticsearchClient;
  secretHashes?: Record<string, any>;
}): Promise<{
  updatedSoObject: Partial<T>;
  secretReferences: SecretReference[];
  secretsToDelete: SecretReference[];
}> {
  const { updatedSoObject, oldSecretPaths, updatedSecretPaths, esClient, secretHashes } = opts;

  if (!oldSecretPaths.length && !updatedSecretPaths.length) {
    return { updatedSoObject, secretReferences: [], secretsToDelete: [] };
  }

  const { toCreate, toDelete, noChange } = diffSOSecretPaths(oldSecretPaths, updatedSecretPaths);

  const createdSecrets = await createSecrets({
    esClient,
    values: toCreate.map((secretPath) => secretPath.value as string),
  });

  const soObjectWithSecretRefs = JSON.parse(JSON.stringify(updatedSoObject));
  toCreate.forEach((secretPath, i) => {
    const pathWithoutPrefix = secretPath.path.replace('secrets.', '');
    const maybeHash = get(secretHashes, pathWithoutPrefix);
    const currentSecret = createdSecrets[i];

    set(soObjectWithSecretRefs, secretPath.path, {
      ...(Array.isArray(currentSecret)
        ? { ids: currentSecret.map(({ id }) => id) }
        : { id: currentSecret.id }),
      ...(typeof maybeHash === 'string' && { hash: maybeHash }),
    });
  });

  const secretReferences = [
    ...noChange.reduce((acc: SecretReference[], secretPath) => {
      const currentValue = secretPath.value as { id: string } | { ids: string[] };
      if ('ids' in currentValue) {
        return [...acc, ...currentValue.ids.map((id: string) => ({ id }))];
      } else {
        return [...acc, { id: currentValue.id }];
      }
    }, []),
    ...createdSecrets.reduce((acc: SecretReference[], secret) => {
      if (Array.isArray(secret)) {
        return [...acc, ...secret.map(({ id }) => ({ id }))];
      }
      return [...acc, { id: secret.id }];
    }, []),
  ];

  return {
    updatedSoObject: soObjectWithSecretRefs,
    secretReferences,
    secretsToDelete: toDelete.map((secretPath) => ({
      id: (secretPath.value as { id: string }).id,
    })),
  };
}

/**
 * Makes the diff betwwen old and new secrets paths
 */
export function diffSOSecretPaths(
  oldPaths: SOSecretPath[],
  newPaths: SOSecretPath[]
): { toCreate: SOSecretPath[]; toDelete: SOSecretPath[]; noChange: SOSecretPath[] } {
  const toCreate: SOSecretPath[] = [];
  const toDelete: SOSecretPath[] = [];
  const noChange: SOSecretPath[] = [];
  const newPathsByPath = keyBy(newPaths, 'path');

  for (const oldPath of oldPaths) {
    if (!newPathsByPath[oldPath.path]) {
      toDelete.push(oldPath);
    }

    const newPath = newPathsByPath[oldPath.path];
    if (newPath && newPath.value) {
      const newValue = newPath.value;
      if (typeof newValue === 'string') {
        toCreate.push(newPath);
        toDelete.push(oldPath);
      } else {
        noChange.push(newPath);
      }
    }
    delete newPathsByPath[oldPath.path];
  }

  const remainingNewPaths = Object.values(newPathsByPath);

  return { toCreate: [...toCreate, ...remainingNewPaths], toDelete, noChange };
}
