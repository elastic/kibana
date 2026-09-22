/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt, type ToolDefinition } from '@kbn/inference-common';
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
            description:
              'Stable identifier for deduplication across runs. Use the lowercase, hyphenated name from logs; keep versions, build hashes, image tags, and instance ids in properties/meta so the id remains stable.',
          },
          type: {
            type: 'string',
            enum: ['entity', 'infrastructure', 'technology', 'dependency', 'schema'],
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
            properties: {},
            minProperties: 1,
            description:
              'Core identifying properties of the feature (e.g. {"name": "order-service"}). Include at least one stable identifying property so the feature can be deduplicated.',
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
              'Supporting evidence from logs. Use `field.path=value` format for key-value pairs. For direct quotes, use plain unescaped text.',
          },
          evidence_doc_ids: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Evidence sources for traceability. Use the Elasticsearch document `_id` values of sample documents that directly support the listed evidence; use an empty array when no `_id` is available or the evidence is aggregate/system-wide.',
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
                minLength: 1,
                description: 'Field name for single equality filter.',
              },
              eq: {
                type: 'string',
                description:
                  'Equality value for a single filter. Represent numbers and booleans as strings.',
              },
              and: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', minLength: 1 },
                    eq: { type: 'string' },
                  },
                  required: ['field', 'eq'],
                  additionalProperties: false,
                },
              },
              or: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', minLength: 1 },
                    eq: { type: 'string' },
                  },
                  required: ['field', 'eq'],
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: false,
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
    ignored_features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          feature_id: {
            type: 'string',
            description: 'The id of the new feature that matched an excluded one.',
          },
          feature_title: {
            type: 'string',
            description: 'The title of the matched new feature.',
          },
          excluded_feature_id: {
            type: 'string',
            description: 'The id of the excluded feature it matched.',
          },
          reason: {
            type: 'string',
            description: 'Why this feature matches the excluded one.',
          },
        },
        required: ['feature_id', 'feature_title', 'excluded_feature_id', 'reason'],
      },
      description:
        'Features not generated because they match an excluded feature. Empty array if no excluded features were provided or no matches found.',
    },
  },
  required: ['features', 'ignored_features'],
} as const;

const searchSimilarFeaturesSchema = {
  type: 'object',
  properties: {
    candidate_id: {
      type: 'string',
      description: 'The id you intend to use for the candidate feature.',
    },
    title: {
      type: 'string',
      description: 'The candidate feature title.',
    },
    description: {
      type: 'string',
      description: 'The candidate feature description.',
    },
    type: {
      type: 'string',
      description: 'The candidate feature type.',
    },
  },
  required: ['candidate_id', 'title', 'description', 'type'],
} as const;

export function createIdentifyFeaturesPrompt({
  systemPrompt,
  additionalTools,
}: {
  systemPrompt: string;
  additionalTools?: Record<string, ToolDefinition>;
}) {
  return createPrompt({
    name: 'identify_features',
    input: z.object({
      sample_documents: z.string(),
      previously_identified_features: z.string(),
      known_feature_ids: z.string(),
      excluded_features: z.string(),
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
        search_similar_features: {
          description:
            'Search known features by meaning when a candidate is absent from known_feature_ids. Treat results as possible matches and reuse an id only for the same real-world component.',
          schema: searchSimilarFeaturesSchema,
        },
        finalize_features: {
          description:
            'Return only the current batch of deduplicated features supported by the current sample documents, plus any excluded-feature matches. Previously identified features are context, not an inventory to return.',
          schema: featuresSchema,
        },
        ...(additionalTools ?? {}),
      },
    })
    .get();
}
