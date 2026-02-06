/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
import { executeEsql, interpolateEsqlQuery } from '../utils/esql';

export interface MatchResult {
  id: string;
  index: string;
  highlights: string[];
  snippets: string[];
}

export interface PerformMatchSearchResponse {
  results: MatchResult[];
}

export const performMatchSearch = async ({
  term,
  fields,
  index,
  size,
  esClient,
  logger,
}: {
  term: string;
  fields: MappingField[];
  index: string;
  size: number;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<PerformMatchSearchResponse> => {
  // Quick and dirty toggle to demonstrate different combinations returning highlights, snippets, or both
  const includeHighlights = true;
  const includeSnippets = true;

  const textFields = fields.filter((field) => field.type === 'text');
  const semanticTextFields = fields.filter((field) => field.type === 'semantic_text');
  const allSearchableFields = [...textFields, ...semanticTextFields];

  // should replace `any` with `SearchRequest` type when the simplified retriever syntax is supported in @elastic/elasticsearch`
  const searchRequest: any = {
    index,
    size,
    retriever: {
      rrf: {
        rank_window_size: size * 2,
        query: term,
        fields: allSearchableFields.map((field) => field.path),
      },
    },
    ...(includeHighlights && {
      highlight: {
        number_of_fragments: 5,
        fragment_size: 500,
        pre_tags: [''],
        post_tags: [''],
        order: 'score',
        fields: fields.reduce((memo, field) => ({ ...memo, [field.path]: {} }), {}),
      },
    }),
  };

  logger.debug(`Elasticsearch search request: ${JSON.stringify(searchRequest, null, 2)}`);

  let response;
  try {
    response = await esClient.search<any>(searchRequest);
  } catch (error) {
    logger.debug(
      `Elasticsearch search failed for index="${index}", term="${term}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }

  const searchResults = response.hits.hits.map((hit) => ({
    id: hit._id!,
    index: hit._index!,
    highlights: includeHighlights
      ? Object.entries(hit.highlight ?? {}).reduce((acc, [_field, highlights]) => {
          acc.push(...highlights);
          return acc;
        }, [] as string[])
      : [],
  }));

  // TOP_SNIPPETS does not yet support multi-valued input. So here, we're hacking in
  // snippet generation by calling `TOP_SNIPPETS` once for each searchable field in each
  // returned document. Yes, this is horribly inefficient, but this is a POC after all ;)
  const results = await Promise.all(
    searchResults.map(async (result) => {
      const snippets: string[] = [];

      if (includeSnippets) {
        for (const field of allSearchableFields) {
          try {
            const fieldName = field.path.includes(' ') ? `\`${field.path}\`` : field.path;
            const indexName = result.index.includes(' ') ? `\`${result.index}\`` : result.index;
            // Using the defaults for numSnippets and numWords, but these can be customized for future experiments if desired
            const numSnippets = 5;
            const numWords = 300;
            const esqlQuery = interpolateEsqlQuery(
              `FROM ${indexName} METADATA _id | WHERE _id == ?docId | EVAL snippets = TOP_SNIPPETS(${fieldName}, ?term, {"num_snippets": ${numSnippets}, "num_words": ${numWords}}) | MV_EXPAND snippets | KEEP snippets`,
              {
                docId: result.id,
                term,
              }
            );

            logger.debug(`Running TOP_SNIPPETS query: ${esqlQuery}`);

            const esqlResponse = await executeEsql({ query: esqlQuery, esClient });

            logger.debug(
              `TOP_SNIPPETS response for doc="${result.id}", field="${field.path}": ${JSON.stringify(esqlResponse)}`
            );

            if (esqlResponse.values.length > 0 && esqlResponse.values[0][0] != null) {
              const snippetValue = esqlResponse.values[0][0];
              if (Array.isArray(snippetValue)) {
                snippets.push(
                  ...snippetValue.filter((s): s is string => typeof s === 'string')
                );
              } else if (typeof snippetValue === 'string') {
                snippets.push(snippetValue);
              }
            }
          } catch (error) {
            logger.debug(
              `TOP_SNIPPETS failed for document id="${result.id}", field="${field.path}": ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      }

      return {
        ...result,
        snippets,
      };
    })
  );

  return { results };
};
