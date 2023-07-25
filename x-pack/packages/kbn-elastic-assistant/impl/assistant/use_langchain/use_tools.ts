/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import z from 'zod';
import { from, firstValueFrom } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import { mapValues, keyBy, reduce } from 'lodash';
import { useCallback, useMemo } from 'react';

import { DynamicTool, DynamicStructuredTool } from 'langchain/tools';

export const useLangchainTools = (kibanaServices) => {
  const combineResults = useCallback(
    (indexPatterns) =>
      from(indexPatterns).pipe(
        concatMap((indexPattern) => {
          console.error('indexPattern', indexPattern);
          const asyncResult1 = kibanaServices.dataViews.getFieldsForWildcard({
            pattern: indexPattern,
          });
          const asyncResult2 = firstValueFrom(
            kibanaServices.data.search.search({
              params: {
                index: indexPattern,
                body: { query: { match_all: {} }, size: 1 },
              },
              options: { ignore: [400] },
            })
          );

          return from(
            Promise.all([
              new Promise((resolve) => resolve(indexPattern)),
              asyncResult1,
              asyncResult2,
            ])
          );
        }),
        toArray()
      ),
    [kibanaServices.data.search, kibanaServices.dataViews]
  );

  const tools = useMemo(
    () => [
      new DynamicTool({
        name: 'list_indices_es_db',
        verbose: true,
        description:
          'Input is an empty string, output is a comma separated list of indices in the datastore.',
        func: async () => {
          const response = await kibanaServices.dataViews.getIndices({
            pattern: '**',
            showAllIndices: true,
            isRollupIndex: () => false,
          });

          return reduce(
            response,
            (acc, item) => {
              if (
                item.item.attributes?.includes('hidden') ||
                item.item.indices?.length ||
                item.item.aliases?.length
              )
                return acc;

              acc.push(item.name as string);

              return acc;
            },
            []
          ).join(', ');
        },
      }),

      new DynamicStructuredTool({
        name: 'query_es_db',
        verbose: true,
        schema: z.string(),
        description: `Input to this tool is JSON with key index with value index name to query and key query with detailed and correct Elasticsearch DSL query. The output is a result from the datastore.
      If the query is not correct, an error message will be returned.
      If an error is returned, rewrite the query, check the query, and try again.`,
        func: async (input) => {
          console.error(
            'input query_es_dib',
            input,
            typeof input,
            input.replaceAll('```', '').trim()
          );

          let parsedQuery;
          try {
            parsedQuery = JSON.parse(input.replaceAll('```', '').trim());
          } catch (e) {
            return `Error: ${e}`;
          }

          const { indexName, query } = parsedQuery;

          console.error('input query_es_db indexName', parsedQuery, indexName, query);

          let response;
          try {
            response = await firstValueFrom(
              kibanaServices.data.search.search({
                params: parsedQuery,
                options: { ignore: [400] },
              })
            );
          } catch (e) {
            return `Error: ${e}`;
          }

          console.error('query_es_db response', response);

          try {
            return JSON.stringify(response?.rawResponse);
          } catch (e) {
            return `Error: ${e}`;
          }
        },
      }),

      new DynamicTool({
        name: 'schema_es_db',
        verbose: true,
        description: `Input to this tool is a comma-separated list of indices, output is the schema and sample documents for those indices.
      Be sure that the indices actually exist by calling list_indices_es_db first!

      Example Input: "index1, index2, index3"`,
        func: async (indices) => {
          console.error('indices', indices);
          const schemas = await firstValueFrom(combineResults(indices.split(', ')));

          console.error('schemas', schemas);

          const schemaString = reduce(
            schemas,
            (acc, item) => {
              acc += `Index: ${item[0]}\nFields: ${JSON.stringify(
                mapValues(keyBy(item[1], 'name'), (field) => field.esTypes?.[0] ?? field.type)
              )}`;

              return acc;
            },
            ''
          );

          console.error('response', schemas, schemaString);

          return schemaString;
        },
      }),
    ],
    [combineResults, kibanaServices.data.search, kibanaServices.dataViews]
  );

  return tools;
};
