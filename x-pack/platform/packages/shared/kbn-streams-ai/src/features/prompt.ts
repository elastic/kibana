/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import { merge } from 'lodash';
import systemPromptTemplate from './system_prompt.text';
import userPromptTemplate from './user_prompt.text';
import infrastructureSystemPromptTemplate from './infrastructure_system_prompt.text';
import infrastructureUserPromptTemplate from './infrastructure_user_prompt.text';

const systemsSchemaBase = {
  type: 'object',
  properties: {
    systems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          filter: {
            type: 'object',
            properties: {},
          },
        },
      },
    },
  },
  required: ['systems'],
} as const;

const systemsSchema = merge({}, systemsSchemaBase, {
  properties: {
    systems: {
      items: {
        required: ['name', 'filter'],
      },
    },
  },
} as const);

const finalSystemsSchema = merge({}, systemsSchema);

export interface ValidateSystemsResponse {
  systems: Array<{
    name: string;
    filter: string;
  }>;
}

export interface FinalizeSystemsResponse {
  systems: Array<{
    name: string;
    filter: string;
    description: string;
  }>;
}

export const IdentifySystemsPrompt = createPrompt({
  name: 'identify_systems',
  input: z.object({
    stream: z.object({
      name: z.string(),
      description: z.string(),
    }),
    dataset_analysis: z.string(),
    initial_clustering: z.string(),
    condition_schema: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: systemPromptTemplate,
      },
    },
    template: {
      mustache: {
        template: userPromptTemplate,
      },
    },
    tools: {
      validate_systems: {
        description: `Validate systems before finalizing`,
        schema: systemsSchema,
      },
      finalize_systems: {
        description: 'Finalize system identification',
        schema: finalSystemsSchema,
      },
    },
  })
  .get();

const infrastructureSchemaBase = {
  type: 'object',
  properties: {
    infrastructure: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
        },
        required: ['name', 'description'],
      },
    },
  },
  required: ['infrastructure'],
} as const;

const finalInfrastructureSchema = merge({}, infrastructureSchemaBase);

export interface FinalizeInfrastructureResponse {
  infrastructure: Array<{
    name: string;
    description: string;
  }>;
}

export const IdentifyInfrastructurePrompt = createPrompt({
  name: 'identify_infrastructure',
  input: z.object({
    stream: z.object({
      name: z.string(),
      description: z.string(),
    }),
    dataset_analysis: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: infrastructureSystemPromptTemplate,
      },
    },
    template: {
      mustache: {
        template: infrastructureUserPromptTemplate,
      },
    },
    tools: {
      finalize_infrastructure: {
        description: 'Finalize infrastructure identification',
        schema: finalInfrastructureSchema,
      },
    },
  })
  .get();
