/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel } from '@kbn/onechat-server';
import { z } from '@kbn/zod';
import { listIndices } from './steps';
import type { NaturalLanguageSearchResponse } from './nl_search';
import { naturalLanguageSearch } from './nl_search';
import type { RelevanceSearchResponse } from './relevance_search';
import { relevanceSearch } from './relevance_search';

export interface UnifiedSearchNlResponse {
  searchMode: 'natural_language';
  response: NaturalLanguageSearchResponse;
}

export interface UnifiedSearchRelevanceResponse {
  searchMode: 'relevance';
  response: RelevanceSearchResponse;
}

export type UnifiedSearchResponse = UnifiedSearchNlResponse | UnifiedSearchRelevanceResponse;

export const unifiedSearch = async ({
  nlQuery,
  index,
  model,
  esClient,
}: {
  nlQuery: string;
  index: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<UnifiedSearchResponse> => {
  const indices = await listIndices({ pattern: index, esClient });
  if (indices.length === 0) {
    throw new Error(`No indices found for ${index}.`);
  }

  const searchType = await selectSearchType({ nlQuery, model });

  if (searchType === 'relevance') {
    const response = await relevanceSearch({
      term: nlQuery,
      esClient,
      model,
      index,
    });
    return {
      searchMode: 'relevance',
      response,
    };
  } else if (searchType === 'analytic') {
    const response = await naturalLanguageSearch({
      nlQuery,
      model,
      index,
      esClient,
    });
    return {
      searchMode: 'natural_language',
      response,
    };
  } else {
    throw new Error(`Invalid search type ${searchType}`);
  }
};

type SearchType = 'analytic' | 'relevance';

const selectSearchType = async ({
  nlQuery,
  model,
}: {
  nlQuery: string;
  model: ScopedModel;
}): Promise<SearchType> => {
  const chatModel = model.chatModel.withStructuredOutput(
    z.object({
      searchMode: z.enum(['analytic', 'relevance']).describe(
        `The type of search.
                   - Use 'analytic' for queries that aggregate, calculate, or retrieve documents based on structured criteria (e.g., latest, top 5, specific field values).
                   - Use 'relevance' for unstructured text searches based on semantic meaning.`
      ),
    })
  );

  const prompt: BaseMessageLike[] = [
    [
      'system',
      `You are an expert search query classifier. Your task is to classify a user's query into 'relevance' or 'analytic' mode.

      ### 1. Relevance Search ('relevance')
      This is for unstructured, "full-text" search. The primary goal is to find documents whose content semantically matches a query phrase. The results are ranked by a relevance score.

      - **Think**: Is the user looking for a topic, concept, or idea within the text?
      - **Keywords**: "about", "find information on", "related to".
      - **Examples**:
        - "find articles about serverless architecture"
        - "search for support tickets mentioning 'billing issue' or 'refund request'"
        - "what is our policy on parental leave?"

      ### 2. Analytic Search ('analytic')
      This is for any query that relies on the **structure** of the data, not just the unstructured text. This includes both calculating new information (aggregations) and retrieving documents based on specific, non-relevance criteria (sorting, filtering).

      - **Think**: Is the user trying to count, group, calculate, or retrieve documents based on a specific order (like latest/oldest) or a filter on a specific field (like a status or date)?
      - **Sub-Types**:
          - **A) Aggregations & Calculations**: Summarizing data across many documents.
              - "create a breakdown of the sales over the last few months"
              - "how many users signed up yesterday?"
              - "what is the average order value?"
          - **B) Structured Document Retrieval**: Fetching specific documents using sorting or filtering.
              - "show me the **last 5 documents** from that index"
              - "get all logs from the past hour"
              - "list all products where the category is 'electronics'"

      Carefully analyze the user's intent to determine the correct mode.`,
    ],
    ['user', `Classify this query: "${nlQuery}"`],
  ];
  const { searchMode } = await chatModel.invoke(prompt);

  return searchMode;
};
