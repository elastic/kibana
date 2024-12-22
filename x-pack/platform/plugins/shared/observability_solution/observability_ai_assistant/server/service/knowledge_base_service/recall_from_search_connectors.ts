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
import { firstValueFrom } from 'rxjs';
import { RecalledEntry } from '.';
import { aiAssistantSearchConnectorIndexPattern } from '../../../common';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { UserPromptAndFiltersForSearchConnector } from '../../utils/recall/rewrite_user_prompt';

export async function recallFromSearchConnectors({
  esClient,
  uiSettingsClient,
  logger,
  core,
  userPromptAndFiltersForSearchConnector,
}: {
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  userPromptAndFiltersForSearchConnector: UserPromptAndFiltersForSearchConnector;
}): Promise<RecalledEntry[]> {
  logger.debug(
    `Querying connector with index: ${
      userPromptAndFiltersForSearchConnector.indexPattern
    } user prompt: ${userPromptAndFiltersForSearchConnector.userPrompt} filters: ${JSON.stringify(
      userPromptAndFiltersForSearchConnector.filters
    )}`
  );

  const [semanticTextConnectors, legacyConnectors] = await Promise.all([
    recallFromSemanticTextConnectors({
      userPromptAndFiltersForSearchConnector,
      esClient,
      uiSettingsClient,
      logger,
    }),

    recallFromLegacyConnectors({
      userPromptAndFiltersForSearchConnector,
      esClient,
      uiSettingsClient,
      logger,
      core,
    }),
  ]);

  return orderBy([...semanticTextConnectors, ...legacyConnectors], (entry) => entry.score, 'desc');
}

async function recallFromSemanticTextConnectors({
  userPromptAndFiltersForSearchConnector,
  esClient,
  logger,
}: {
  userPromptAndFiltersForSearchConnector: UserPromptAndFiltersForSearchConnector;
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
}): Promise<RecalledEntry[]> {
  const fieldCaps = await esClient.asCurrentUser.fieldCaps({
    index: userPromptAndFiltersForSearchConnector.indexPattern,
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

  const response = await esClient.asCurrentUser.search<unknown>({
    index: userPromptAndFiltersForSearchConnector.indexPattern,
    size: 20,
    _source: {
      excludes: semanticTextFields.map((field) => `${field}.inference`),
    },
    query: {
      bool: {
        should: semanticTextFields.flatMap((field) => ({
          bool: {
            filter: [
              { semantic: { field, query: userPromptAndFiltersForSearchConnector.userPrompt } },
              ...userPromptAndFiltersForSearchConnector.filters,
            ],
          },
        })),
        minimum_should_match: 1,
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

async function recallFromLegacyConnectors({
  userPromptAndFiltersForSearchConnector,
  esClient,
  logger,
  core,
}: {
  userPromptAndFiltersForSearchConnector: UserPromptAndFiltersForSearchConnector;
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
}): Promise<RecalledEntry[]> {
  const ML_INFERENCE_PREFIX = 'ml.inference.';

  const modelIdPromise = getElserModelId(core, logger); // pre-fetch modelId in parallel with fieldCaps
  const fieldCaps = await esClient.asCurrentUser.fieldCaps({
    index: userPromptAndFiltersForSearchConnector.indexPattern,
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

    return {
      bool: {
        should: [
          {
            text_expansion: {
              [vectorField]: {
                model_text: userPromptAndFiltersForSearchConnector.userPrompt,
                model_id: modelId,
              },
            },
          },
        ],
        filter: [{ term: { [modelField]: modelId } }],
      },
    };
  });

  const response = await esClient.asCurrentUser.search<unknown>({
    index: userPromptAndFiltersForSearchConnector.indexPattern,
    size: 20,
    _source: {
      exclude: ['_*', 'ml*'],
    },
    query: {
      bool: {
        should: esQueries,
        filter: [...userPromptAndFiltersForSearchConnector.filters],
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

export async function getConnectorIndices({
  esClient,
  uiSettingsClient,
  logger,
}: {
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
}) {
  // improve performance by running this in parallel with the `uiSettingsClient` request
  const responsePromise = esClient.asInternalUser.connector
    .list({ filter_path: 'results.service_type,results.index_name' }) // get service type and index name for each connector. TODO: Ask enterprise search to add a description for each connector. This should help the LLM
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

  const connectorIndices = compact(response.results?.map((result) => result.index_name)); //  TODO: add `service_type` to output

  // preserve backwards compatibility with 8.14 (may not be needed in the future)
  if (isEmpty(connectorIndices)) {
    return ['search-*'];
  }

  return connectorIndices;
}

async function getElserModelId(
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>,
  logger: Logger
) {
  const defaultModelId = '.elser_model_2';
  const [_, pluginsStart] = await core.getStartServices();

  // Wait for the license to be available so the ML plugin's guards pass once we ask for ELSER stats
  const license = await firstValueFrom(pluginsStart.licensing.license$);
  if (!license.hasAtLeast('enterprise')) {
    return defaultModelId;
  }

  try {
    // Wait for the ML plugin's dependency on the internal saved objects client to be ready
    const { ml } = await core.plugins.onSetup('ml');

    if (!ml.found) {
      throw new Error('Could not find ML plugin');
    }

    const elserModelDefinition = await (
      ml.contract as {
        trainedModelsProvider: (
          request: {},
          soClient: {}
        ) => { getELSER: () => Promise<{ model_id: string }> };
      }
    )
      .trainedModelsProvider({} as any, {} as any) // request, savedObjectsClient (but we fake it to use the internal user)
      .getELSER();

    return elserModelDefinition.model_id;
  } catch (error) {
    logger.error(`Failed to resolve ELSER model definition: ${error}`);
    return defaultModelId;
  }
}
