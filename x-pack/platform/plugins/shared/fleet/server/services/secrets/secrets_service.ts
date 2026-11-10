/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { FleetServerRequirementSettingsKey } from '../fleet_server/version_requirements';

import {
  createSecrets as createFleetSecrets,
  deleteSecrets as deleteFleetSecrets,
  isSecretStorageEnabledForFeature as isFleetSecretStorageEnabledForFeature,
} from './common';

export interface SecretsServiceInterface {
  /** Creates one Fleet secret per value in `.fleet-secrets`. Returns ids in input order. */
  createSecrets(values: string[]): Promise<Array<{ id: string }>>;
  /** Deletes Fleet secrets by id. Missing ids are not an error. */
  deleteSecrets(ids: string[]): Promise<void>;
  /**
   * True when every enrolled Fleet Server is at least `minimumFleetServerVersion`
   * (always true when Fleet Server is standalone/serverless). Latches `settingKey` in Fleet settings once met.
   */
  isSecretStorageEnabledForFeature(opts: {
    featureName: string;
    minimumFleetServerVersion: string;
    settingKey: FleetServerRequirementSettingsKey;
  }): Promise<boolean>;
}

/** Creates the Fleet secrets service exposed on the start contract, bound to Fleet's internal clients. */
export const createSecretsService = (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): SecretsServiceInterface => ({
  createSecrets: async (values) => {
    const secrets = await createFleetSecrets({ esClient, values });

    return secrets.flat().map(({ id }) => ({ id }));
  },
  deleteSecrets: (ids) => deleteFleetSecrets({ esClient, ids, ignoreNotFound: true }),
  isSecretStorageEnabledForFeature: (opts) =>
    isFleetSecretStorageEnabledForFeature({ esClient, soClient, ...opts }),
});
