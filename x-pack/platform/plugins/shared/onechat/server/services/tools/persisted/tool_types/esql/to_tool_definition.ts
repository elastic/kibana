/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolConfig } from '@kbn/onechat-common';
import { ToolType } from '@kbn/onechat-common';
import { z } from '@kbn/zod';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { getToolResultId } from '@kbn/onechat-server/src/tools';
import { interpolateEsqlQuery } from '@kbn/onechat-genai-utils/tools/utils';
import type { ToolPersistedDefinition } from '../../client';
import type { InternalToolDefinition } from '../../../tool_provider';

export function toToolDefinition<TSchema extends z.ZodObject<any> = z.ZodObject<any>>(
  esqlTool: ToolPersistedDefinition<EsqlToolConfig>
): InternalToolDefinition<EsqlToolConfig, TSchema> {
  const { id, description, tags, configuration } = esqlTool;
  return {
    id,
    type: ToolType.esql,
    description,
    tags,
    configuration,
    readonly: false,
    schema: createSchemaFromParams(configuration.params) as TSchema,
    handler: async (params, { esClient }) => {
      const client = esClient.asCurrentUser;
      const paramArray = Object.entries(params).map(([key, value]) => ({ [key]: value }));

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
    },
  };
}

function createSchemaFromParams(params: EsqlToolConfig['params']): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const [key, param] of Object.entries(params)) {
    let field: z.ZodTypeAny;
    switch (param.type) {
      case 'text':
      case 'keyword':
        field = z.string();
        break;
      case 'long':
      case 'integer':
        field = z.number().int();
        break;
      case 'double':
      case 'float':
        field = z.number();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'date':
        field = z.string().datetime();
        break;
      case 'object':
        field = z.record(z.unknown());
        break;
      case 'nested':
        field = z.array(z.record(z.unknown()));
        break;
    }

    field = field.describe(param.description);

    schemaFields[key] = field;
  }

  return z.object(schemaFields).describe('Parameters needed to execute the query');
}
