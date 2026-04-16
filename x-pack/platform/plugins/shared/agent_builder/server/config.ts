/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  githubBaseUrl: schema.string({ defaultValue: 'https://github.com' }),
  topSnippets: schema.object({
    numSnippets: schema.number({ defaultValue: 2, min: 1, max: 10 }),
    numWords: schema.number({ defaultValue: 750, min: 1, max: 5000 }),
  }),
  memory: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    showToolCalls: schema.boolean({ defaultValue: true }),
    retrieval: schema.object({
      roundStartEnabled: schema.boolean({ defaultValue: true }),
      method: schema.oneOf(
        [
          schema.literal('bm25'),
          schema.literal('semantic'),
          schema.literal('hybrid'),
          schema.literal('conversation'),
        ],
        { defaultValue: 'bm25' }
      ),
      inferenceEndpointId: schema.maybe(schema.string()),
      reranking: schema.oneOf(
        [schema.literal('nothing'), schema.literal('memx'), schema.literal('ab')],
        { defaultValue: 'nothing' }
      ),
      postRetrieval: schema.object({
        deduplicate: schema.boolean({ defaultValue: false }),
        lowConfidenceRejection: schema.object({
          enabled: schema.boolean({ defaultValue: false }),
          threshold: schema.number({ defaultValue: 0.5, min: 0, max: 1 }),
        }),
      }),
      conversation: schema.object({
        topK: schema.number({ defaultValue: 3, min: 1, max: 20 }),
        stage: schema.oneOf(
          [schema.literal(1), schema.literal(2)],
          { defaultValue: 1 }
        ),
      }),
    }),
    extraction: schema.object({
      method: schema.oneOf(
        [schema.literal('llm'), schema.literal('cognitive'), schema.literal('chunking'), schema.literal('turn')],
        { defaultValue: 'llm' }
      ),
      connectorId: schema.maybe(schema.string()),
      chunking: schema.object({
        method: schema.oneOf(
          [
            schema.literal('fixed'),
            schema.literal('texttiling'),
            schema.literal('embedding_similarity'),
            schema.literal('hybrid'),
          ],
          { defaultValue: 'fixed' }
        ),
        maxChunkChars: schema.number({ defaultValue: 300, min: 50, max: 2000 }),
        overlapChars: schema.number({ defaultValue: 30, min: 0, max: 200 }),
        texttiling: schema.object({
          windowSize: schema.number({ defaultValue: 20, min: 5, max: 100 }),
          smoothingWidth: schema.number({ defaultValue: 2, min: 0, max: 10 }),
          threshold: schema.number({ defaultValue: 0.1, min: 0, max: 1 }),
        }),
        embeddingSimilarity: schema.object({
          sentenceWindowSize: schema.number({ defaultValue: 3, min: 1, max: 20 }),
          similarityThreshold: schema.number({ defaultValue: 0.3, min: 0, max: 1 }),
          similarity: schema.oneOf(
            [schema.literal('tfidf'), schema.literal('inference')],
            { defaultValue: 'tfidf' }
          ),
        }),
      }),
    }),
  }),
});

export type AgentBuilderConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AgentBuilderConfig> = {
  exposeToBrowser: {
    memory: {
      showToolCalls: true,
    },
  },
  schema: configSchema,
};
