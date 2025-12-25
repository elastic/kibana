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

/**
 * Resolves parameter values by applying defaults for missing parameters.
 * @param paramDefinitions - The parameter definitions from the tool configuration
 * @param providedParams - The parameters provided by the LLM
 * @returns Resolved parameters with defaults applied
 */
export const resolveToolParameters = (
  paramDefinitions: EsqlToolConfig['params'],
  providedParams: Record<string, unknown>
): Record<string, unknown> => {
  return Object.keys(paramDefinitions).reduce((acc, paramName) => {
    const param = paramDefinitions[paramName];
    const providedValue = providedParams[paramName];

    if (providedValue !== undefined) {
      // LLM provided a value, use it
      acc[paramName] = providedValue;
    } else if (param.optional && param.defaultValue !== undefined) {
      // LLM didn't provide a value, but we have a default
      acc[paramName] = param.defaultValue;
    } else {
      // No value provided and no default, use null
      acc[paramName] = null;
    }

    return acc;
  }, {} as Record<string, unknown>);
};

export const createHandler = (
  configuration: EsqlToolConfig
): ToolHandlerFn<z.infer<ZodObject<any>>> => {
  return async (params, { esClient }) => {
    const client = esClient.asCurrentUser;

    // Apply default values for parameters that weren't provided by the LLM
    const resolvedParams = resolveToolParameters(configuration.params, params);

    const paramArray = Object.keys(configuration.params).map((param) => ({
      [param]: resolvedParams[param] ?? null,
    }));

    const result = await client.esql.query({
      query: configuration.query,
      // TODO: wait until client is fixed: https://github.com/elastic/elasticsearch-specification/issues/5083
      params: paramArray as unknown as FieldValue[],
    });

    // need the interpolated query to return in the results / to display in the UI
    const interpolatedQuery = interpolateEsqlQuery(configuration.query, resolvedParams);

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
