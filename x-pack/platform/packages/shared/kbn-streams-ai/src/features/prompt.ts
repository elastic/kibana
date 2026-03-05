/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import featuresUserPrompt from './user_prompt.text';
import featuresSystemPrompt from './system_prompt.text';

export { featuresSystemPrompt as featuresPrompt };

const featuresSchema = {
  type: 'object',
  properties: {
    features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the feature.',
          },
          type: {
            type: 'string',
          },
          subtype: {
            type: 'string',
          },
          description: {
            type: 'string',
            description: 'A summary of the feature.',
          },
          title: {
            type: 'string',
            description: 'Very short human-readable title for UI (e.g. table, flyout header).',
          },
          properties: {
            type: 'object',
            description:
              'Stable, low-cardinality identifying properties. Must contain at least one key/value.',
            properties: {},
            minProperties: 1,
            description:
              'Core identifying properties of the feature (e.g. {"name": "order-service"}). Empty properties are invalid — every feature must have at least one stable identifying property.',
            additionalProperties: true,
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
            description:
              'The evidences that support the feature. Can be a short sentence or a `key: value` string.',
          },
          evidence_doc_ids: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Evidence sources for traceability. This must be the Elasticsearch document `_id` values of sample documents that directly support the listed evidence. Keep an empty array when not applicable.',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'The tags that describe the feature.',
          },
          filter: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                description: 'Field name for single equality filter.',
              },
              eq: {
                type: 'string',
                description:
                  'Equality value for single filter. For numbers/booleans, string representation is allowed.',
              },
              and: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    eq: { type: 'string' },
                  },
                  required: ['field', 'eq'],
                },
              },
              or: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    eq: { type: 'string' },
                  },
                  required: ['field', 'eq'],
                },
              },
            },
            description:
              'Optional condition used to scope filtering to the corresponding feature. Allowed forms: single equality `{field, eq}` or one-level `{and: [...]}` / `{or: [...]}` of equality conditions.',
          },
          meta: {
            type: 'object',
            properties: {},
            description: 'Useful metadata that is not captured in other properties.',
            additionalProperties: true,
          },
        },
        required: [
          'id',
          'type',
          'subtype',
          'description',
          'title',
          'properties',
          'confidence',
          'evidence',
          'tags',
        ],
      },
    },
  },
  required: ['features'],
} as const;

export function createIdentifyFeaturesPrompt({ systemPrompt }: { systemPrompt: string }) {
  return createPrompt({
    name: 'identify_features',
    input: z.object({
      sample_documents: z.string(),
    }),
  })
    .version({
      system: {
        mustache: {
          template: systemPrompt,
        },
      },
      template: {
        mustache: {
          template: featuresUserPrompt,
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
