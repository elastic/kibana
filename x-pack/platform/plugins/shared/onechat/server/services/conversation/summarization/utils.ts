/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, UserIdAndName } from '@kbn/onechat-common';
import type { ConversationSummary, SummaryStructuredData } from './types';

export const createConversationSummary = ({
  conversation,
  user,
  summary,
  structuredData,
  spaceId,
  createdAt = new Date(),
  updatedAt = createdAt,
}: {
  conversation: Conversation;
  user: UserIdAndName;
  summary: string;
  structuredData: SummaryStructuredData;
  spaceId: string;
  createdAt?: Date;
  updatedAt?: Date;
}): ConversationSummary => {
  return {
    user_id: user.id,
    user_name: user.username,
    agent_id: conversation.agent_id,
    space: spaceId,
    title: conversation.title,
    semantic_summary: summary,
    structured_data: structuredData,
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString(),
  };
};

export const createSemanticSummary = ({
  structuredData,
}: {
  structuredData: SummaryStructuredData;
}): string => {
  const {
    title,
    discussion_summary: overallSummary,
    user_intent: userIntent,
    agent_actions: agentActions,
    key_topics: keyTopics,
    outcomes_and_decisions: outcomesAndDecisions,
    unanswered_questions: unansweredQuestions,
  } = structuredData;

  const summary = `
Title: ${title}
Summary: ${overallSummary}
User Intent: ${userIntent}
Key Topics: ${keyTopics.join(', ')}
Entities:\n ${structuredData.entities
    .map((entity) => `- ${entity.type}: ${entity.name}`)
    .join('\n')}
Agent Actions:\n ${agentActions.map((item) => ` - ${item}`).join('\n')}
Outcomes and Decisions:\n ${outcomesAndDecisions.map((item) => ` - ${item}`).join('\n')}
Unanswered Questions:\n ${unansweredQuestions.map((item) => ` - ${item}`).join('\n')}
`;

  return summary;
};
