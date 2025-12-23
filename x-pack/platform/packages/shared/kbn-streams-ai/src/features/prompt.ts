/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod';
import { FeatureType } from '@kbn/streams-schema';
import userPromptTemplate from './user_prompt.text';

const featuresSchema = {
  type: 'object',
  properties: {
    features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          value: {
            type: 'string',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 100,
          },
          evidence: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        required: ['name', 'value', 'confidence', 'evidence'],
      },
    },
  },
  required: ['features'],
} as const;

export interface FinalizeFeaturesResponse {
  features: Array<{
    type: FeatureType;
    name: string;
    value: string;
    confidence: number;
    evidence: string[];
  }>;
}

export function createIdentifyFeaturesPrompt({
  systemPromptOverride,
}: {
  systemPromptOverride: string;
}) {
  return createPrompt({
    name: 'identify_features',
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
          template: systemPromptOverride,
        },
      },
      template: {
        mustache: {
          template: userPromptTemplate,
        },
      },
      tools: {
        finalize_features: {
          description: 'Finalize features identification',
          schema: featuresSchema,
        },
      },
    })
    .get();
}
