/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import systemPromptTemplate from './system_prompt.text';
import infrastructurePromptTemplate from './infrastructure_prompt.text';
import technologyPromptTemplate from './technology_prompt.text';
import systemUserPromptTemplate from './system_user_prompt.text';
import basicFeatureUserPromptTemplate from './basic_feature_user_prompt.text';

const baseInputSchema = z.object({
  stream: z.object({
    name: z.string(),
    description: z.string(),
  }),
  dataset_analysis: z.string(),
});

const systemsSchema = {
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
        required: ['name', 'filter'],
      },
    },
  },
  required: ['systems'],
} as const;

const commonFeatureSchema = {
  type: 'object',
  properties: {
    features: {
      type: 'array',
      items: {
        required: ['name', 'description'],
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
        },
      },
    },
  },
  required: ['features'],
} as const;

export const IdentifySystemsPrompt = createPrompt({
  name: 'identify_systems',
  input: baseInputSchema.and(
    z.object({
      initial_clustering: z.string(),
      condition_schema: z.string(),
    })
  ),
})
  .version({
    system: {
      mustache: {
        template: systemPromptTemplate,
      },
    },
    template: {
      mustache: {
        template: systemUserPromptTemplate,
      },
    },
    tools: {
      validate_systems: {
        description: `Validate systems before finalizing`,
        schema: systemsSchema,
      },
      finalize_features: {
        description: 'Finalize system features identification',
        schema: systemsSchema,
      },
    },
  })
  .get();

export const IdentifyInfrastructurePrompt = createPrompt({
  name: 'identify_infrastructure',
  input: baseInputSchema,
})
  .version({
    system: {
      mustache: {
        template: infrastructurePromptTemplate,
      },
    },
    template: {
      mustache: {
        template: basicFeatureUserPromptTemplate,
      },
    },
    tools: {
      finalize_features: {
        description: 'Finalize infrastructure features identification',
        schema: commonFeatureSchema,
      },
    },
  })
  .get();

export const IdentifyTechnologyPrompt = createPrompt({
  name: 'identify_technology',
  input: baseInputSchema,
})
  .version({
    system: {
      mustache: {
        template: technologyPromptTemplate,
      },
    },
    template: {
      mustache: {
        template: basicFeatureUserPromptTemplate,
      },
    },
    tools: {
      finalize_features: {
        description: 'Finalize technology features identification',
        schema: commonFeatureSchema,
      },
    },
  })
  .get();
