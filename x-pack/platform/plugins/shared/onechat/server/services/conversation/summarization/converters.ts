/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ConversationSummaryProperties } from './storage';
import type { ConversationSummary } from './types';

export type Document = Pick<GetResponse<ConversationSummaryProperties>, '_source' | '_id'>;

export const fromEs = (document: Document): ConversationSummary => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }

  return {
    user_id: document._source.user_id,
    user_name: document._source.user_name,
    agent_id: document._source.agent_id,
    space: document._source.space,
    title: document._source.title,
    created_at: document._source.created_at,
    updated_at: document._source.updated_at,
    semantic_summary: document._source.semantic_summary,
    structured_data: {
      title: document._source.structured_data.title,
      discussion_summary: document._source.structured_data.discussion_summary,
      user_intent: document._source.structured_data.user_intent,
      key_topics: document._source.structured_data.key_topics ?? [],
      outcomes_and_decisions: document._source.structured_data.outcomes_and_decisions ?? [],
      unanswered_questions: document._source.structured_data.unanswered_questions ?? [],
      agent_actions: document._source.structured_data.agent_actions ?? [],
      entities: document._source.structured_data.entities ?? [],
    },
  };
};

export const toEs = ({
  summary,
  space,
}: {
  summary: ConversationSummary;
  space: string;
}): ConversationSummaryProperties => {
  return {
    agent_id: summary.agent_id,
    user_id: summary.user_id,
    user_name: summary.user_name,
    space,
    title: summary.title,
    created_at: summary.created_at,
    updated_at: summary.updated_at,
    semantic_summary: summary.semantic_summary,
    structured_data: {
      title: summary.structured_data.title,
      discussion_summary: summary.structured_data.discussion_summary,
      user_intent: summary.structured_data.user_intent,
      key_topics: summary.structured_data.key_topics ?? [],
      outcomes_and_decisions: summary.structured_data.outcomes_and_decisions ?? [],
      unanswered_questions: summary.structured_data.unanswered_questions ?? [],
      agent_actions: summary.structured_data.agent_actions ?? [],
      entities: summary.structured_data.entities ?? [],
    },
  };
};
