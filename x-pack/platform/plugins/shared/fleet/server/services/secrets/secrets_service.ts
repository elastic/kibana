/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import type { DeletedSecretResponse } from '../../../common/types';
import {
  RESPONSE_ACTIONS_EXPORT_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
  SECRETS_ENDPOINT_PATH,
} from '../../constants';
import { FleetError, isESClientError } from '../../errors';
import { appContextService } from '../app_context';
import { runWithAuditConsumer } from '../audit_logging';
import { retryTransientEsErrors } from '../epm/elasticsearch/retry';
import type { FleetServerRequirementSettingsKey } from '../fleet_server/version_requirements';
import { getRequestStore } from '../request_store';

import {
  createSecrets as createFleetSecrets,
  isSecretStorageEnabledForFeature as isFleetSecretStorageEnabledForFeature,
  writeSecretDeletedAuditLog,
} from './common';

/** Features that may store secrets through the Fleet secrets service. */
export type SecretStorageFeature = 'response_actions_export';

interface SecretStorageFeatureRequirements {
  featureName: string;
  minimumFleetServerVersion: string;
  settingKey: FleetServerRequirementSettingsKey;
}

// The settings latch is sticky: raising a feature's minimum version needs a new settings key.
const SECRET_STORAGE_FEATURES: Readonly<
  Record<SecretStorageFeature, SecretStorageFeatureRequirements>
> = {
  response_actions_export: {
    featureName: 'Response actions export secrets',
    minimumFleetServerVersion: RESPONSE_ACTIONS_EXPORT_SECRETS_MINIMUM_FLEET_SERVER_VERSION,
    settingKey: 'response_actions_export_secret_storage_requirements_met',
  },
};

// `_fleet/secret` stores each secret under an Elasticsearch auto-generated document id:
// a time-based UUID of 15 bytes, encoded as 20 characters of unpadded URL-safe base64.
const SECRET_ID_PATTERN = /^[A-Za-z0-9_-]{20}$/;

export interface SecretsServiceInterface {
  /** Creates one Fleet secret per value. Returns ids in input order. */
  createSecrets(values: string[]): Promise<Array<{ id: string }>>;
  /**
   * Deletes secrets by id. Callers may only pass ids returned by their own `createSecrets`.
   * Unknown ids are reported as `deleted: false`, never hidden or thrown. Malformed ids throw.
   */
  deleteSecrets(ids: string[]): Promise<Array<{ id: string; deleted: boolean }>>;
  /** True when all Fleet Servers support secrets for `feature` (always true when standalone). Fleet owns the key and version. */
  isSecretStorageEnabledForFeature(feature: SecretStorageFeature): Promise<boolean>;
}

interface SecretsServiceOptions {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  /** The user's request, for audit attribution. Omitted for background work. */
  request?: KibanaRequest;
  /** Calling feature, recorded in audit entries. */
  consumer: string;
}

const deleteSecret = async (
  esClient: ElasticsearchClient,
  id: string
): Promise<{ id: string; deleted: boolean }> => {
  const logger = appContextService.getLogger();
  let attempts = 0;

  try {
    const { deleted }: DeletedSecretResponse = await retryTransientEsErrors(
      () => {
        attempts++;
        return esClient.transport.request({
          method: 'DELETE',
          path: `${SECRETS_ENDPOINT_PATH}/${encodeURIComponent(id)}`,
        });
      },
      { logger }
    );

    return { id, deleted };
  } catch (err) {
    if (isESClientError(err) && err.meta.statusCode === 404) {
      // An earlier attempt failed with a transient error, so it may have deleted the secret before failing.
      return { id, deleted: attempts > 1 };
    }

    const msg = `Error deleting secrets: ${err}`;
    logger.error(msg);
    throw new FleetError(msg);
  }
};

/** Creates the Fleet secrets service for one consumer, optionally scoped to the user's request for auditing. */
export const createSecretsService = ({
  esClient,
  soClient,
  request,
  consumer,
}: SecretsServiceOptions): SecretsServiceInterface => {
  if (!consumer) {
    throw new FleetError('A consumer is required to use the Fleet secrets service');
  }

  const runInCallerContext = <T>(fn: () => Promise<T>): Promise<T> => {
    const withConsumer = () => runWithAuditConsumer(consumer, fn);
    return request ? getRequestStore().run(request, withConsumer) : withConsumer();
  };

  return {
    createSecrets: (values) =>
      runInCallerContext(async () => {
        const secrets = await createFleetSecrets({ esClient, values });

        return secrets.flat().map(({ id }) => ({ id }));
      }),

    deleteSecrets: async (ids) => {
      const invalidIdCount = ids.filter(
        (id) => typeof id !== 'string' || !SECRET_ID_PATTERN.test(id)
      ).length;
      if (invalidIdCount > 0) {
        throw new FleetError(
          `Cannot delete ${invalidIdCount} malformed Fleet secret id(s): only ids returned by createSecrets can be deleted`
        );
      }

      return runInCallerContext(() =>
        Promise.all(
          ids.map(async (id) => {
            const result = await deleteSecret(esClient, id);
            if (result.deleted) {
              writeSecretDeletedAuditLog(id);
            }
            return result;
          })
        )
      );
    },

    isSecretStorageEnabledForFeature: async (feature) => {
      if (!Object.hasOwn(SECRET_STORAGE_FEATURES, feature)) {
        throw new FleetError(`Unknown secret storage feature: ${feature}`);
      }

      return runInCallerContext(() =>
        isFleetSecretStorageEnabledForFeature({
          esClient,
          soClient,
          ...SECRET_STORAGE_FEATURES[feature],
        })
      );
    },
  };
};
