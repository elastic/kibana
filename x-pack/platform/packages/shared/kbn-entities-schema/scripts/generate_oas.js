/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/setup-node-env');

const swaggerJsdoc = require('swagger-jsdoc');
const { z } = require('@kbn/zod');

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
  target: 'openapi-3.0',
  cycles: 'ref',
  reused: 'inline',
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
          createEntityDefinitionQuerySchema: z.toJSONSchema(
            createEntityDefinitionQuerySchema,
            schemaOptions
          ),
          getEntityDefinitionQuerySchema: z.toJSONSchema(
            getEntityDefinitionQuerySchema,
            schemaOptions
          ),
          resetEntityDefinitionParamsSchema: z.toJSONSchema(
            resetEntityDefinitionParamsSchema,
            schemaOptions
          ),
          deleteEntityDefinitionParamsSchema: z.toJSONSchema(
            deleteEntityDefinitionParamsSchema,
            schemaOptions
          ),
          deleteEntityDefinitionQuerySchema: z.toJSONSchema(
            deleteEntityDefinitionQuerySchema,
            schemaOptions
          ),
          entityDefinitionSchema: z.toJSONSchema(entityDefinitionSchema, schemaOptions),
          entitySummarySchema: z.toJSONSchema(entityLatestSchema, schemaOptions),
          entityHistorySchema: z.toJSONSchema(entityHistorySchema, schemaOptions),
        },
      },
    },
    apis: ['../../../../plugins/observability_solution/entity_manager/server/routes/**/*.ts'],
    ...options,
  });
