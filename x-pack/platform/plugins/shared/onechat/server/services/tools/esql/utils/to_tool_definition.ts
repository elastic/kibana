/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlToolConfig, ToolType } from '@kbn/onechat-common';
import { z } from '@kbn/zod';
import type { ToolPersistedDefinition } from '../../client';
import { ToolDefinition } from '../../tool_provider';

export function toToolDefinition<
  TSchema extends z.ZodObject<any> = z.ZodObject<any>,
  TResult = unknown
>(
  esqlTool: ToolPersistedDefinition<EsqlToolConfig>
): ToolDefinition<EsqlToolConfig, TSchema, TResult> {
  const { id, description, tags, configuration } = esqlTool;
  return {
    id,
    type: ToolType.esql,
    description,
    tags,
    configuration,
    schema: createSchemaFromParams(configuration.params) as TSchema,
    handler: async (params, { esClient }) => {
      const client = esClient.asCurrentUser;
      const paramArray = Object.entries(params).map(([key, value]) => ({ [key]: value }));

      const response = await client.transport.request({
        method: 'POST',
        path: '/_query',
        body: {
          query: configuration.query,
          params: paramArray,
        },
      });

      return {
        result: response as TResult,
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
