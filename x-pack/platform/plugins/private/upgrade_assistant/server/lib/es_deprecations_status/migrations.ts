/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MigrationDeprecationsResponse,
  MigrationDeprecationsDeprecation,
} from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import _ from 'lodash';
import { EnrichedDeprecationInfo } from '../../../common/types';
import {
  convertFeaturesToIndicesArray,
  getESSystemIndicesMigrationStatus,
} from '../es_system_indices_migration';
import { type EsMetadata, getCorrectiveAction } from './get_corrective_actions';
import { esIndicesStateCheck } from '../es_indices_state_check';

/**
 * Remove once the these keys are added to the `MigrationDeprecationsResponse` type
 */
interface EsDeprecations extends MigrationDeprecationsResponse {
  templates: Record<string, MigrationDeprecationsDeprecation[]>;
  ilm_policies: Record<string, MigrationDeprecationsDeprecation[]>;
}

const createBaseMigrationDeprecation = (
  migrationDeprecation: MigrationDeprecationsDeprecation,
  { deprecationType, indexName }: { deprecationType: keyof EsDeprecations; indexName?: string }
) => {
  const {
    details,
    message,
    url,
    level,
    _meta: metadata,
    resolve_during_rolling_upgrade: resolveDuringUpgrade,
  } = migrationDeprecation;

  return {
    index: indexName,
    type: deprecationType,
    details,
    message,
    url,
    isCritical: level === 'critical',
    metadata,
    resolveDuringUpgrade,
  };
};

const normalizeEsResponse = (migrationsResponse: EsDeprecations) => {
  const indexSettingsMigrations = Object.entries(migrationsResponse.index_settings).flatMap(
    ([indexName, migrationDeprecations]) => {
      return migrationDeprecations.flatMap((migrationDeprecation) =>
        createBaseMigrationDeprecation(migrationDeprecation, {
          indexName,
          deprecationType: 'index_settings',
        })
      );
    }
  );

  const dataStreamsMigrations = Object.entries(migrationsResponse.data_streams).flatMap(
    ([indexName, dataStreamDeprecations]) => {
      return dataStreamDeprecations.flatMap((depractionData) =>
        createBaseMigrationDeprecation(depractionData, {
          indexName,
          deprecationType: 'data_streams',
        })
      );
    }
  );

  const ilmPoliciesMigrations = Object.entries(migrationsResponse.ilm_policies).flatMap(
    ([indexName, ilmPolicyDeprecations]) => {
      return ilmPolicyDeprecations.flatMap((ilmPolicyData) =>
        createBaseMigrationDeprecation(ilmPolicyData, {
          indexName,
          deprecationType: 'ilm_policies',
        })
      );
    }
  );

  const templatesMigrations = Object.entries(migrationsResponse.templates).flatMap(
    ([indexName, templatesDeprecations]) => {
      return templatesDeprecations.flatMap((templatesDataa) =>
        createBaseMigrationDeprecation(templatesDataa, {
          indexName,
          deprecationType: 'templates',
        })
      );
    }
  );

  const mlSettingsMigrations = migrationsResponse.ml_settings.map((depractionData) =>
    createBaseMigrationDeprecation(depractionData, { deprecationType: 'ml_settings' })
  );
  const nodeSettingsMigrations = migrationsResponse.node_settings.map((depractionData) =>
    createBaseMigrationDeprecation(depractionData, { deprecationType: 'node_settings' })
  );

  const clusterSettingsMigrations = migrationsResponse.cluster_settings.map((depractionData) =>
    createBaseMigrationDeprecation(depractionData, { deprecationType: 'cluster_settings' })
  );

  return [
    ...clusterSettingsMigrations,
    ...mlSettingsMigrations,
    ...nodeSettingsMigrations,
    ...indexSettingsMigrations,
    ...dataStreamsMigrations,
    ...ilmPoliciesMigrations,
    ...templatesMigrations,
  ].flat();
};

export const getEnrichedDeprecations = async (
  dataClient: IScopedClusterClient
): Promise<EnrichedDeprecationInfo[]> => {
  const deprecations = (await dataClient.asCurrentUser.migration.deprecations()) as EsDeprecations;
  const systemIndices = await getESSystemIndicesMigrationStatus(dataClient.asCurrentUser);

  const systemIndicesList = convertFeaturesToIndicesArray(systemIndices.features);

  const indexSettingsIndexNames = Object.keys(deprecations.index_settings);
  const indexSettingsIndexStates = indexSettingsIndexNames.length
    ? await esIndicesStateCheck(dataClient.asCurrentUser, indexSettingsIndexNames)
    : {};

  const deprecationsByIndex = new Map<string, EnrichedDeprecationInfo[]>();

  return normalizeEsResponse(deprecations)
    .filter((deprecation) => {
      switch (deprecation.type) {
        case 'index_settings': {
          if (!deprecation.index) {
            return false;
          }
          // filter out system indices
          return !systemIndicesList.includes(deprecation.index);
        }
        case 'cluster_settings':
        case 'templates':
        case 'ilm_policies':
        case 'ml_settings':
        case 'node_settings':
        case 'data_streams': {
          return true;
        }
        default: {
          // Throwing here to avoid allowing upgrades while we have unhandled deprecation types from ES
          // That might cause the stack to fail to start after upgrade.
          throw new Error(`Unknown ES deprecation type "${deprecation.type}"`);
        }
      }
    })
    .map((deprecation) => {
      const correctiveAction = getCorrectiveAction(
        deprecation.type,
        deprecation.message,
        deprecation.metadata as EsMetadata,
        deprecation.index
      );

      // If we have found deprecation information for index/indices
      // check whether the index is open or closed.
      if (deprecation.type === 'index_settings' && correctiveAction?.type === 'reindex') {
        correctiveAction.blockerForReindexing =
          indexSettingsIndexStates[deprecation.index!] === 'closed' ? 'index-closed' : undefined;
      }

      const enrichedDeprecation = {
        ..._.omit(deprecation, 'metadata'),
        correctiveAction,
      };

      if (deprecation.index) {
        const indexDeprecations = deprecationsByIndex.get(deprecation.index) || [];
        indexDeprecations.push(enrichedDeprecation);
        deprecationsByIndex.set(deprecation.index, indexDeprecations);
      }

      return enrichedDeprecation;
    })
    .filter((deprecation) => {
      if (
        deprecation.index &&
        deprecation.message.includes(`Index [${deprecation.index}] is a frozen index`)
      ) {
        // frozen indices are created in 7.x, so they are old / incompatible as well
        // reindexing + deleting is required, so no need to bubble up this deprecation in the UI
        const indexDeprecations = deprecationsByIndex.get(deprecation.index)!;
        const oldIndexDeprecation: EnrichedDeprecationInfo | undefined = indexDeprecations.find(
          (elem) =>
            elem.type === 'index_settings' &&
            elem.index === deprecation.index &&
            elem.correctiveAction?.type === 'reindex'
        );
        if (oldIndexDeprecation) {
          oldIndexDeprecation.frozen = true;
          return false;
        }
      }

      return true;
    });
};
