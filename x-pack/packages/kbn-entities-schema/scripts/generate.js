require('../../../../src/setup_node_env');

const swaggerJsdoc = require('swagger-jsdoc');
const {zodToJsonSchema} = require('zod-to-json-schema');

const { 
  getEntityDefinitionQuerySchema,
  resetEntityDefinitionParamsSchema,
  deleteEntityDefinitionParamsSchema,
  deleteEntityDefinitionQuerySchema,
  entityDefinitionSchema, 
  entitySummarySchema, 
  entityHistorySchema,
 } = require('@kbn/entities-schema');

const schemaOptions = { 
  target: 'openApi3',
  $refStrategy: 'none',
 }

export const generateOAS = (options) => swaggerJsdoc({
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Elastic Entity Model (EEM) API',
      version: 'v1',
    },
    components: {
      schemas: {
        "getEntityDefinitionQuerySchema": zodToJsonSchema(getEntityDefinitionQuerySchema, schemaOptions),
        "resetEntityDefinitionParamsSchema": zodToJsonSchema(resetEntityDefinitionParamsSchema, schemaOptions),
        "deleteEntityDefinitionParamsSchema": zodToJsonSchema(deleteEntityDefinitionParamsSchema, schemaOptions),
        "deleteEntityDefinitionQuerySchema": zodToJsonSchema(deleteEntityDefinitionQuerySchema, schemaOptions),
        "entityDefinitionSchema": zodToJsonSchema(entityDefinitionSchema, schemaOptions),
        "entitySummarySchema": zodToJsonSchema(entitySummarySchema, schemaOptions),
        "entityHistorySchema": zodToJsonSchema(entityHistorySchema, schemaOptions),
      },
    },
  },
  apis: [    
    '../../plugins/observability_solution/entity_manager/server/routes/**/*.ts'
  ],
  ...options,
});
