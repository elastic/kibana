/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  QueryDslQueryContainer,
  SearchRequest,
  SearchHighlight,
} from '@elastic/elasticsearch/lib/api/types';
import { ML_INFERENCE_PREFIX, kbQueryToDsl, kbQueryToSparseVector } from './kb_query_to_dsl';
import { ObservabilityAIAssistantPluginStartDependencies } from '../../types';
import { KnowledgeBaseQueryContainer } from './types';
import { getElserModelId } from './get_elser_model_id';

function getHighlights(fields: string[]): SearchHighlight {
  return {
    fields: Object.fromEntries(fields.map((field) => [field, {}])),
  };
}

export function wrapExistingQuery(
  query?: QueryDslQueryContainer | undefined,
  wrap?: { should?: QueryDslQueryContainer[]; must?: QueryDslQueryContainer[] }
) {
  if (!wrap?.must && !wrap?.should) {
    return query;
  }

  return {
    bool: {
      should: wrap.should,
      must: [...(wrap.must ?? []), ...(query ? [query] : [])],
    },
  };
}

export function formatKnowledgeBaseTextQueries({
  queries,
  textFields,
  query,
}: {
  queries: KnowledgeBaseQueryContainer[];
  textFields: string[];
} & Pick<SearchRequest, 'query'>) {
  return queries.length
    ? wrapExistingQuery(query, {
        must: [...(query ? [query] : [])],
        should: queries.map((kbQuery) => {
          return kbQueryToDsl(kbQuery, textFields);
        }),
      })
    : query;
}

function formatKnowledgeBaseSparseVectorQueries({
  queries,
  textFields,
  modelId,
  query,
}: {
  queries?: KnowledgeBaseQueryContainer[];
  modelId: string;
  textFields: string[];
} & Pick<SearchRequest, 'query'>) {
  return queries?.length
    ? wrapExistingQuery(query, {
        must: [...(query ? [query] : [])],
        should: queries.map((kbQuery) => {
          return kbQueryToSparseVector(kbQuery, textFields, modelId);
        }),
      })
    : query;
}

export async function getTextFieldsQuery({
  client,
  indexPattern,
  queries,
}: {
  client: ElasticsearchClient;
  indexPattern: string | string[];
  queries: KnowledgeBaseQueryContainer[];
}): Promise<{ query: QueryDslQueryContainer | undefined; highlight: SearchHighlight }> {
  const response = await client.fieldCaps({
    index: indexPattern,
    allow_no_indices: true,
    fields: '*',
    types: ['text'],
  });

  const textFields = Object.keys(response.fields);

  return {
    query: formatKnowledgeBaseTextQueries({ queries, textFields }),
    highlight: getHighlights(textFields),
  };
}

export async function getSparseVectorFieldsQuery({
  queries,
  client,
  indexPattern,
  core,
  logger,
}: {
  queries: KnowledgeBaseQueryContainer[];
  client: ElasticsearchClient;
  indexPattern: string | string[];
  core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  logger: Logger;
}): Promise<{ query?: QueryDslQueryContainer | undefined; highlight?: SearchHighlight }> {
  const response = await client.fieldCaps({
    index: indexPattern,
    allow_no_indices: true,
    fields: `${ML_INFERENCE_PREFIX}*`,
    types: ['sparse_vector'],
    filters: '-metadata,-parent',
  });

  const fieldsWithVectors = Object.keys(response.fields).map((field) =>
    field.replace('_expanded.predicted_value', '').replace(ML_INFERENCE_PREFIX, '')
  );

  if (fieldsWithVectors.length) {
    const modelId = await getElserModelId({
      core,
      logger,
    });
    return {
      query: formatKnowledgeBaseSparseVectorQueries({
        queries,
        modelId,
        textFields: fieldsWithVectors,
      }),
      highlight: getHighlights(fieldsWithVectors),
    };
  }

  return {};
}
