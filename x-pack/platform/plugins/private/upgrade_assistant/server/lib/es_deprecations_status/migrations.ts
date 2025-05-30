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
import { omit } from 'lodash';
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

/**
 * Remove once the these keys are added to the `MigrationDeprecationsResponse` type
 */
interface EsDeprecations extends MigrationDeprecationsResponse {
  templates: Record<string, MigrationDeprecationsDeprecation[]>;
  ilm_policies: Record<string, MigrationDeprecationsDeprecation[]>;
}
type DeprecationLevel = 'none' | 'info' | 'warning' | 'critical';

export interface BaseDeprecation {
  index?: string;
  type: keyof EsDeprecations;
  details?: string;
  message: string;
  url: string;
  level: DeprecationLevel;
  metadata?: EsMetadata;
  resolveDuringUpgrade: boolean;
  // these properties apply to index_settings deprecations only
  isFrozenIndex?: boolean;
  isClosedIndex?: boolean;
}

const createBaseDeprecation = (
  migrationDeprecation: MigrationDeprecationsDeprecation,
  { deprecationType, indexName }: { deprecationType: keyof EsDeprecations; indexName?: string }
): BaseDeprecation => {
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
    level,
    metadata: metadata as EsMetadata,
    resolveDuringUpgrade,
  };
};

const normalizeEsResponse = (migrationsResponse: EsDeprecations) => {
  const indexSettingsDeprecations = Object.entries(migrationsResponse.index_settings).flatMap(
    ([indexName, migrationDeprecations]) => {
      return migrationDeprecations.flatMap((migrationDeprecation) =>
        createBaseDeprecation(migrationDeprecation, {
          indexName,
          deprecationType: 'index_settings',
        })
      );
    }
  );

  const dataStreamsDeprecations = Object.entries(migrationsResponse.data_streams).flatMap(
    ([indexName, dataStreamDeprecations]) => {
      return dataStreamDeprecations.flatMap((depractionData) =>
        createBaseDeprecation(depractionData, {
          indexName,
          deprecationType: 'data_streams',
        })
      );
    }
  );

  const ilmPoliciesDeprecations = Object.entries(migrationsResponse.ilm_policies).flatMap(
    ([indexName, ilmPolicyDeprecations]) => {
      return ilmPolicyDeprecations.flatMap((ilmPolicyData) =>
        createBaseDeprecation(ilmPolicyData, {
          indexName,
          deprecationType: 'ilm_policies',
        })
      );
    }
  );

  const templatesDeprecations = Object.entries(migrationsResponse.templates).flatMap(
    ([indexName, templateDeprecations]) => {
      return templateDeprecations.flatMap((templateData) =>
        createBaseDeprecation(templateData, {
          indexName,
          deprecationType: 'templates',
        })
      );
    }
  );

  const mlSettingsDeprecations = migrationsResponse.ml_settings.map((depractionData) =>
    createBaseDeprecation(depractionData, { deprecationType: 'ml_settings' })
  );
  const nodeSettingsDeprecations = migrationsResponse.node_settings.map((depractionData) =>
    createBaseDeprecation(depractionData, { deprecationType: 'node_settings' })
  );

  const clusterSettingsDeprecations = migrationsResponse.cluster_settings.map((depractionData) =>
    createBaseDeprecation(depractionData, { deprecationType: 'cluster_settings' })
  );

  return [
    ...clusterSettingsDeprecations,
    ...mlSettingsDeprecations,
    ...nodeSettingsDeprecations,
    ...indexSettingsDeprecations,
    ...dataStreamsDeprecations,
    ...ilmPoliciesDeprecations,
    ...templatesDeprecations,
  ].flat();
};

const isKnownDeprecation = (deprecation: BaseDeprecation): boolean => {
  switch (deprecation.type) {
    case 'index_settings':
    case 'cluster_settings':
    case 'templates':
    case 'ilm_policies':
    case 'ml_settings':
    case 'node_settings':
    case 'data_streams': {
      return true;
    }
    default: {
      return false;
    }
  }
};

const enrichIndexSettingsDeprecations = async (
  esClient: ElasticsearchClient,
  deprecations: BaseDeprecation[]
): Promise<void> => {
  const deprecationsByIndex = new Map<string, BaseDeprecation[]>();
  const indexSettingsDeprecations = deprecations.filter(
    (deprecation) => deprecation.type === 'index_settings'
  );

  // we do a first pass to store all the index deprecations in a Map
  indexSettingsDeprecations.forEach((deprecation) => {
    const indexDeprecations = deprecationsByIndex.get(deprecation.index!) ?? [];
    indexDeprecations.push(deprecation);
    deprecationsByIndex.set(deprecation.index!, indexDeprecations);
  });

  // fetch open/closed state for all of the index_settings deprecations indices
  const indexNames = Array.from(deprecationsByIndex.keys());
  const indexStates = indexNames.length ? await esIndicesStateCheck(esClient, indexNames) : {};

  // Update some properties for each of the index_settings deprecations
  indexSettingsDeprecations.forEach((deprecation) => {
    deprecation.isClosedIndex = indexStates[deprecation.index!] === 'closed';

    // check if a given deprecation is a "frozen index deprecation"
    const isFrozenIndex = isFrozenDeprecation(deprecation.message, deprecation.index);

    // update all deprecations for the same index
    if (isFrozenIndex) {
      deprecationsByIndex
        .get(deprecation.index!)!
        .forEach((indexDeprecation) => (indexDeprecation.isFrozenIndex = true));
    }
  });
};

const excludeDeprecation = (
  deprecation: BaseDeprecation,
  correctiveAction?: CorrectiveAction
): boolean => {
  if (deprecation.type === 'index_settings' && correctiveAction?.type === 'reindex') {
    return true;
  } else if (
    deprecation.type === 'data_streams' &&
    correctiveAction?.type === 'dataStream' &&
    correctiveAction.metadata.reindexRequired
  ) {
    return true;
  } else if (
    deprecation.level === 'critical' &&
    deprecation.type === 'index_settings' &&
    deprecation.isFrozenIndex &&
    correctiveAction?.type === 'reindex'
  ) {
    // in this scenario we will already have a "frozen index" deprecation for the same index
    // we will filter this 'reindex' deprecation out, and let the 'unfreeze' one pass through
    return true;
  }

  return false;
};

export const getEnrichedDeprecations = async (
  esClient: ElasticsearchClient
): Promise<EnrichedDeprecationInfo[]> => {
  const esDeprecations = (await esClient.migration.deprecations()) as EsDeprecations;
  const deprecations = normalizeEsResponse(esDeprecations);

  // Throwing here to avoid allowing upgrades while we have unhandled deprecation types from ES
  // That might cause the stack to fail to start after upgrade.
  deprecations.forEach((deprecation) => {
    if (!isKnownDeprecation(deprecation)) {
      throw new Error(`Unknown ES deprecation type "${deprecation.type}"`);
    }
  });

  // Kibana system indices are handled in a different section of the Upgrade Assistant
  const systemIndices = await getESSystemIndicesMigrationStatus(esClient);
  const systemIndicesList = convertFeaturesToIndicesArray(systemIndices.features);
  const filteredDeprecations = deprecations.filter(
    (deprecation) =>
      deprecation.type !== 'index_settings' || !systemIndicesList.includes(deprecation.index!)
  );

  // Set extra metadata properties for index_settings deprecations
  await enrichIndexSettingsDeprecations(esClient, filteredDeprecations);

  // enrich deprecations with the corrective actions, remove metadata
  return filteredDeprecations.flatMap((deprecation) => {
    const correctiveAction = getCorrectiveAction(deprecation);

    // Prevent some deprecations from showing up in the UI
    if (excludeDeprecation(deprecation, correctiveAction)) {
      return []; // equivalent of filtering out, thanks to the flatMap
    }

    return {
      ...omit(deprecation, 'metadata', 'isFrozenIndex', 'isClosedIndex', 'isInDataStream'),
      correctiveAction,
    };
  });
};
