/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RootSchema, EventTypeOpts } from '@kbn/core/server';

interface ScoredDocument {
  content: string;
  elserScore: number;
  llmScore: number;
}

export interface RecallRanking {
  prompt: string;
  scoredDocuments: ScoredDocument[];
}

const schema: RootSchema<RecallRanking> = {
  prompt: {
    type: 'text',
    _meta: {
      description: 'The user prompt that was used for the ELSER text_expansion',
    },
  },
  scoredDocuments: {
    type: 'array',
    items: {
      properties: {
        content: {
          type: 'text',
          _meta: {
            description: 'The raw content of the recalled document',
          },
        },
        elserScore: {
          type: 'float',
          _meta: {
            description: 'The score produced by ELSER text_expansion',
          },
        },
        llmScore: {
          type: 'integer',
          _meta: {
            description: 'The score produced by the LLM when asked to rerank',
          },
        },
      },
    },
  },
};

export const recallRankingEventType = 'observability_ai_assistant_recall_ranking';

export const recallRankingEvent: EventTypeOpts<RecallRanking> = {
  eventType: recallRankingEventType,
  schema,
};
