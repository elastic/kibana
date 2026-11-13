/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';

export const AGENT_KNOWLEDGE_WIKI_RECALL_EVENT = 'agent_knowledge_wiki_recall';
export const AGENT_KNOWLEDGE_WIKI_RECORD_EVENT = 'agent_knowledge_wiki_record';

export const registerWikiTelemetryEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType({
    eventType: AGENT_KNOWLEDGE_WIKI_RECALL_EVENT,
    schema: {
      ai_index_id: { type: 'keyword', _meta: { description: 'Wiki AI index registry id' } },
      page_count: { type: 'long', _meta: { description: 'Number of pages recalled' } },
      product: {
        type: 'keyword',
        _meta: { description: 'Product type pack bound to the AI index', optional: true },
      },
    },
  });

  analytics.registerEventType({
    eventType: AGENT_KNOWLEDGE_WIKI_RECORD_EVENT,
    schema: {
      ai_index_id: { type: 'keyword', _meta: { description: 'Wiki AI index registry id' } },
      applied_count: { type: 'long', _meta: { description: 'Number of edits applied' } },
      skipped_count: { type: 'long', _meta: { description: 'Number of edits skipped' } },
      product: {
        type: 'keyword',
        _meta: { description: 'Product type pack bound to the AI index', optional: true },
      },
    },
  });
};
