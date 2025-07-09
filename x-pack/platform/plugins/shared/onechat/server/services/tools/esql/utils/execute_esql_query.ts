/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EsqlTool, EsqlToolDefinition, RegisteredTool } from '@kbn/onechat-server';
import { z } from '@kbn/zod';

function toRegisteredTool<
  RunInput extends z.ZodObject<any> = z.ZodObject<any>,
  RunOutput = unknown
>(esqlTool: EsqlTool<RunInput, RunOutput>): RegisteredTool<RunInput, RunOutput> {
  const { id, description, meta, schema, handler } = esqlTool;
  return { id, description, meta, schema, handler };
}

function createSchemaFromParams(params: EsqlToolDefinition['params']): z.ZodObject<any> {
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

  const schema = z.object(schemaFields).describe('Parameters needed to execute the query');
  return schema;
}

export const registeredToolCreator = (tool: EsqlToolDefinition): RegisteredTool => {
  const esqlSchema = createSchemaFromParams(tool.params);

  const executableTool: EsqlTool = {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    query: tool.query,
    params: tool.params,
    schema: esqlSchema,
    handler: async (params, { esClient }) => {
      const client = esClient.asCurrentUser;
      const paramArray = Object.entries(params).map(([key, value]) => ({ [key]: value }));

      const response = await client.transport.request({
        method: 'POST',
        path: '/_query',
        body: {
          query: tool.query,
          params: paramArray,
        },
      });

      return {
        result: response,
      };
    },
    meta: tool.meta,
  };
  return toRegisteredTool(executableTool);
};
