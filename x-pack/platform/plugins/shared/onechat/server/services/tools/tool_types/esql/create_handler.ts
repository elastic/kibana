/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { z, ZodObject } from '@kbn/zod';
import type { ToolHandlerFn } from '@kbn/onechat-server';
import { interpolateEsqlQuery } from '@kbn/onechat-genai-utils/tools/utils';
import { type EsqlToolConfig, ToolResultType } from '@kbn/onechat-common';
import { getToolResultId } from '@kbn/onechat-server/tools';

export const createHandler = (
  configuration: EsqlToolConfig
): ToolHandlerFn<z.infer<ZodObject<any>>> => {
  return async (params, { esClient }) => {
    const client = esClient.asCurrentUser;
    const paramArray = Object.keys(configuration.params).map((param) => ({
      [param]: params[param] ?? null,
    }));

    const result = await client.esql.query({
      query: configuration.query,
      // TODO: wait until client is fixed: https://github.com/elastic/elasticsearch-specification/issues/5083
      params: paramArray as unknown as FieldValue[],
    });

    // need the interpolated query to return in the results / to display in the UI
    const interpolatedQuery = interpolateEsqlQuery(configuration.query, params);

    return {
      results: [
        {
          type: ToolResultType.query,
          data: {
            esql: interpolatedQuery,
          },
        },
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.tabularData,
          data: {
            source: 'esql',
            query: interpolatedQuery,
            columns: result.columns,
            values: result.values,
          },
        },
      ],
    };
  };
};
