/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../src/setup_node_env');

const swaggerJsdoc = require('swagger-jsdoc');
const { zodToJsonSchema } = require('zod-to-json-schema');

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

const schemaOptions = {
  target: 'openApi3',
  $refStrategy: 'none',
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
          createEntityDefinitionQuerySchema: zodToJsonSchema(
            createEntityDefinitionQuerySchema,
            schemaOptions
          ),
          getEntityDefinitionQuerySchema: zodToJsonSchema(
            getEntityDefinitionQuerySchema,
            schemaOptions
          ),
          resetEntityDefinitionParamsSchema: zodToJsonSchema(
            resetEntityDefinitionParamsSchema,
            schemaOptions
          ),
          deleteEntityDefinitionParamsSchema: zodToJsonSchema(
            deleteEntityDefinitionParamsSchema,
            schemaOptions
          ),
          deleteEntityDefinitionQuerySchema: zodToJsonSchema(
            deleteEntityDefinitionQuerySchema,
            schemaOptions
          ),
          entityDefinitionSchema: zodToJsonSchema(entityDefinitionSchema, schemaOptions),
          entitySummarySchema: zodToJsonSchema(entityLatestSchema, schemaOptions),
          entityHistorySchema: zodToJsonSchema(entityHistorySchema, schemaOptions),
        },
      },
    },
    apis: ['../../plugins/observability_solution/entity_manager/server/routes/**/*.ts'],
    ...options,
  });
