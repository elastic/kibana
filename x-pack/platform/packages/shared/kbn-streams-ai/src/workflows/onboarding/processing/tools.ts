/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const pipelineSchema = {
  type: 'object',
  properties: {
    processors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'a short id to identify the processor',
          },
          config: {
            type: 'object',
            properties: {},
            additionalProperties: true,
          },
        },
        required: ['id', 'config'],
      },
    },
  },
  required: ['processors'],
} as const;

export const processingTools = {
  validate_pipeline: {
    description: 'Suggest processors to append to the existing processors',
    schema: pipelineSchema,
  },
  finalize_pipeline: {
    description: 'Finalize additional processors to add to pipeline',
    schema: pipelineSchema,
  },
};
