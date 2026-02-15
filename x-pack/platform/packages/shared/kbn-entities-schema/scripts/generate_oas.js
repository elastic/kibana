/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');

const swaggerJsdoc = require('swagger-jsdoc');
const { z } = require('@kbn/zod/v4');

const {
  createEntityDefinitionQuerySchema,
  getEntityDefinitionQuerySchema,
  resetEntityDefinitionParamsSchema,
  deleteEntityDefinitionParamsSchema,
  deleteEntityDefinitionQuerySchema,
  entityDefinitionSchema,
  entityLatestSchema,
  entityHistorySchema,
} = require('..');

const toOpenApiSchema = (schema) => {
  // eslint-disable-next-line no-unused-vars
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema, {
    unrepresentable: 'any',
    io: 'input',
  });
  return jsonSchema;
};

export const generateOAS = (options) =>
  swaggerJsdoc({
    definition: {
      openapi: '3.1.0',
      info: {
        title: 'Elastic Entity Model (EEM) API',
        version: 'v1',
      },
      components: {
        schemas: {
          createEntityDefinitionQuerySchema: toOpenApiSchema(createEntityDefinitionQuerySchema),
          getEntityDefinitionQuerySchema: toOpenApiSchema(getEntityDefinitionQuerySchema),
          resetEntityDefinitionParamsSchema: toOpenApiSchema(resetEntityDefinitionParamsSchema),
          deleteEntityDefinitionParamsSchema: toOpenApiSchema(deleteEntityDefinitionParamsSchema),
          deleteEntityDefinitionQuerySchema: toOpenApiSchema(deleteEntityDefinitionQuerySchema),
          entityDefinitionSchema: toOpenApiSchema(entityDefinitionSchema),
          entitySummarySchema: toOpenApiSchema(entityLatestSchema),
          entityHistorySchema: toOpenApiSchema(entityHistorySchema),
        },
      },
    },
    apis: ['../../../../plugins/observability_solution/entity_manager/server/routes/**/*.ts'],
    ...options,
  });
