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
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import _ from 'lodash';
import type { CorrectiveAction, EnrichedDeprecationInfo } from '../../../common/types';
import {
  convertFeaturesToIndicesArray,
  getESSystemIndicesMigrationStatus,
} from '../es_system_indices_migration';
import {
  type EsMetadata,
  getCorrectiveAction,
  isFrozenDeprecation,
} from './get_corrective_actions';
import { esIndicesStateCheck } from '../es_indices_state_check';
import { ENT_SEARCH_DATASTREAM_PREFIXES, ENT_SEARCH_INDEX_PREFIX } from '../enterprise_search';

/**
 * Remove once the these keys are added to the `MigrationDeprecationsResponse` type
 */
interface EsDeprecations extends MigrationDeprecationsResponse {
  templates: Record<string, MigrationDeprecationsDeprecation[]>;
  ilm_policies: Record<string, MigrationDeprecationsDeprecation[]>;
}

interface BaseMigrationDeprecation {
  index?: string;
  type: keyof EsDeprecations;
  details?: string;
  message: string;
  url: string;
  isCritical: boolean;
  metadata?: Record<string, any>;
  resolveDuringUpgrade: boolean;
  isFrozenIndex?: boolean;
  isInDataStream?: boolean;
}

const createBaseMigrationDeprecation = (
  migrationDeprecation: MigrationDeprecationsDeprecation,
  { deprecationType, indexName }: { deprecationType: keyof EsDeprecations; indexName?: string }
): BaseMigrationDeprecation => {
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
    ...(metadata?.is_in_data_stream && { isInDataStream: metadata?.is_in_data_stream }),
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
    ...enrichIndexSettingsMigrations(indexSettingsMigrations),
    ...dataStreamsMigrations,
    ...ilmPoliciesMigrations,
    ...templatesMigrations,
  ].flat();
};

const enrichIndexSettingsMigrations = (
  deprecations: BaseMigrationDeprecation[]
): BaseMigrationDeprecation[] => {
  const deprecationsByIndex = new Map<string, EnrichedDeprecationInfo[]>();

  const deprecationsWithIndex = deprecations.filter(({ index }) => Boolean(index));
  // we do a first pass to store all the index deprecations in a Map

  deprecationsWithIndex.forEach((deprecation) => {
    const indexDeprecations = deprecationsByIndex.get(deprecation.index!) ?? [];
    indexDeprecations.push(deprecation);
    deprecationsByIndex.set(deprecation.index!, indexDeprecations);
  });

  // in a second pass, we update the deprecation info
  deprecationsWithIndex.forEach((deprecation) => {
    // check if a given deprecation is a "frozen index deprecation"
    const isFrozenIndex = isFrozenDeprecation(deprecation.message, deprecation.index);

    // update all deprecations for the same index
    if (isFrozenIndex) {
      deprecationsByIndex
        .get(deprecation.index!)!
        .forEach((indexDeprecation) => (indexDeprecation.isFrozenIndex = true));
    }
  });

  return deprecations;
};

const excludeDeprecation = (
  deprecation: BaseMigrationDeprecation,
  correctiveAction?: CorrectiveAction
): boolean => {
  if (
    deprecation.type === 'index_settings' &&
    correctiveAction?.type === 'reindex' &&
    deprecation.index?.startsWith(ENT_SEARCH_INDEX_PREFIX)
  ) {
    return true;
  } else if (
    deprecation.type === 'data_streams' &&
    correctiveAction?.type === 'dataStream' &&
    correctiveAction.metadata.reindexRequired &&
    ENT_SEARCH_DATASTREAM_PREFIXES.some((prefix) => deprecation.index?.startsWith(prefix))
  ) {
    return true;
  } else if (
    isFrozenDeprecation(deprecation.message, deprecation.index) &&
    deprecation.isInDataStream
  ) {
    return true;
  } else if (
    deprecation.type === 'index_settings' &&
    deprecation.isFrozenIndex &&
    correctiveAction?.type === 'reindex'
  ) {
    return true;
  }

  return false;
};

export const getEnrichedDeprecations = async (
  dataClient: ElasticsearchClient
): Promise<EnrichedDeprecationInfo[]> => {
  const deprecations = (await dataClient.migration.deprecations()) as EsDeprecations;
  const systemIndices = await getESSystemIndicesMigrationStatus(dataClient);

  const systemIndicesList = convertFeaturesToIndicesArray(systemIndices.features);

  const indexSettingsIndexNames = Object.keys(deprecations.index_settings);
  const indexSettingsIndexStates = indexSettingsIndexNames.length
    ? await esIndicesStateCheck(dataClient, indexSettingsIndexNames)
    : {};

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
    .flatMap((deprecation) => {
      const correctiveAction = getCorrectiveAction(
        deprecation.type,
        deprecation.message,
        deprecation.metadata as EsMetadata,
        deprecation.index
      );

      // Early exclusion of deprecations
      if (excludeDeprecation(deprecation, correctiveAction)) {
        return [];
      }

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

      return enrichedDeprecation;
    });
};
