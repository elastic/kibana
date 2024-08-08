import swaggerJsdoc from 'swagger-jsdoc';

export const generateOAS = (options) => swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Elastic entity model API',
      version: '1.0.0',
    },
  },
  apis: [
    '../../plugins/observability_solution/entity_manager/server/routes/**/*.ts'
  ],
  ...options,
});
