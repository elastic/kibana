/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema, EventTypeOpts } from '@kbn/core/server';
import { type Connector, type Scope, connectorSchema, scopeSchema } from '../../common/analytics';

interface ScoredDocument extends Connector, Scope {
  esScore: number;
  llmScore: number;
}

export interface RecallRanking {
  scoredDocuments: ScoredDocument[];
}

const schema: RootSchema<RecallRanking> = {
  scoredDocuments: {
    type: 'array',
    items: {
      properties: {
        esScore: {
          type: 'float',
          _meta: {
            description: 'The score produced by Elasticsearch',
          },
        },
        llmScore: {
          type: 'integer',
          _meta: {
            description: 'The score produced by the LLM when asked to rerank',
          },
        },
        connector: {
          properties: connectorSchema,
        },
        scopes: scopeSchema,
      },
    },
  },
};

export const recallRankingEventType = 'observability_ai_assistant_recall_ranking';

export const recallRankingEvent: EventTypeOpts<RecallRanking> = {
  eventType: recallRankingEventType,
  schema,
};
