/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { isEmpty, orderBy, compact } from 'lodash';
import type { Logger } from '@kbn/logging';
import { CoreSetup } from '@kbn/core-lifecycle-server';
import { RecalledEntry } from '.';
import { aiAssistantSearchConnectorIndexPattern } from '../../../common';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { getElserModelId } from './get_elser_model_id';

export async function recallFromSearchConnectors({
  queries,
  esClient,
  uiSettingsClient,
  logger,
  core,
}: {
  queries: Array<{ text: string; boost?: number }>;
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
}): Promise<RecalledEntry[]> {
  const connectorIndices = await getConnectorIndices(esClient, uiSettingsClient, logger);
  logger.debug(`Found connector indices: ${connectorIndices}`);

  const [semanticTextConnectors, legacyConnectors] = await Promise.all([
    recallFromSemanticTextConnectors({
      queries,
      esClient,
      uiSettingsClient,
      logger,
      core,
      connectorIndices,
    }),

    recallFromLegacyConnectors({
      queries,
      esClient,
      uiSettingsClient,
      logger,
      core,
      connectorIndices,
    }),
  ]);

  return orderBy([...semanticTextConnectors, ...legacyConnectors], (entry) => entry.score, 'desc');
}

async function recallFromSemanticTextConnectors({
  queries,
  esClient,
  logger,
  core,
  connectorIndices,
}: {
  queries: Array<{ text: string; boost?: number }>;
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  connectorIndices: string[] | undefined;
}): Promise<RecalledEntry[]> {
  const fieldCaps = await esClient.asCurrentUser.fieldCaps({
    index: connectorIndices,
    fields: `*`,
    allow_no_indices: true,
    types: ['semantic_text'],
    filters: '-metadata,-parent',
  });

  const semanticTextFields = Object.keys(fieldCaps.fields);
  if (!semanticTextFields.length) {
    return [];
  }
  logger.debug(`Semantic text field for search connectors: ${semanticTextFields}`);

  const params = {
    index: connectorIndices,
    size: 20,
    query: {
      bool: {
        should: semanticTextFields.flatMap((field) => {
          return queries.map(({ text, boost = 1 }) => ({
            bool: { filter: [{ semantic: { field, query: text, boost } }] },
          }));
        }),
        minimum_should_match: 1,
      },
    },
  };

  const response = await esClient.asCurrentUser.search<unknown>(params);

  const results = response.hits.hits.map((hit) => ({
    text: JSON.stringify(hit._source),
    score: hit._score!,
    is_correction: false,
    id: hit._id!,
  }));

  return results;
}

async function recallFromLegacyConnectors({
  queries,
  esClient,
  logger,
  core,
  connectorIndices,
}: {
  queries: Array<{ text: string; boost?: number }>;
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  connectorIndices: string[] | undefined;
}): Promise<RecalledEntry[]> {
  const ML_INFERENCE_PREFIX = 'ml.inference.';

  const modelIdPromise = getElserModelId({ core, logger }); // pre-fetch modelId in parallel with fieldCaps
  const fieldCaps = await esClient.asCurrentUser.fieldCaps({
    index: connectorIndices,
    fields: `${ML_INFERENCE_PREFIX}*`,
    allow_no_indices: true,
    types: ['sparse_vector'],
    filters: '-metadata,-parent',
  });

  const fieldsWithVectors = Object.keys(fieldCaps.fields).map((field) =>
    field.replace('_expanded.predicted_value', '').replace(ML_INFERENCE_PREFIX, '')
  );

  if (!fieldsWithVectors.length) {
    return [];
  }

  const modelId = await modelIdPromise;
  const esQueries = fieldsWithVectors.flatMap((field) => {
    const vectorField = `${ML_INFERENCE_PREFIX}${field}_expanded.predicted_value`;
    const modelField = `${ML_INFERENCE_PREFIX}${field}_expanded.model_id`;

    return queries.map(({ text, boost = 1 }) => {
      return {
        bool: {
          should: [
            {
              sparse_vector: {
                field: vectorField,
                query: text,
                inference_id: modelId,
                boost,
              },
            },
          ],
          filter: [
            {
              term: {
                [modelField]: modelId,
              },
            },
          ],
        },
      };
    });
  });

  const response = await esClient.asCurrentUser.search<unknown>({
    index: connectorIndices,
    size: 20,
    _source: {
      exclude: ['_*', 'ml*'],
    },
    query: {
      bool: {
        should: esQueries,
      },
    },
  });

  const results = response.hits.hits.map((hit) => ({
    text: JSON.stringify(hit._source),
    score: hit._score!,
    is_correction: false,
    id: hit._id!,
  }));

  return results;
}

async function getConnectorIndices(
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient },
  uiSettingsClient: IUiSettingsClient,
  logger: Logger
) {
  // improve performance by running this in parallel with the `uiSettingsClient` request
  const responsePromise = esClient.asInternalUser.connector
    .list({ filter_path: 'results.index_name' })
    .catch((e) => {
      logger.warn(`Failed to fetch connector indices due to ${e.message}`);
      return { results: [] };
    });

  const customSearchConnectorIndex = await uiSettingsClient.get<string>(
    aiAssistantSearchConnectorIndexPattern
  );

  if (customSearchConnectorIndex) {
    return customSearchConnectorIndex.split(',');
  }

  const response = await responsePromise;

  const connectorIndices = compact(response.results?.map((result) => result.index_name));

  // preserve backwards compatibility with 8.14 (may not be needed in the future)
  if (isEmpty(connectorIndices)) {
    return ['search-*'];
  }

  return connectorIndices;
}
