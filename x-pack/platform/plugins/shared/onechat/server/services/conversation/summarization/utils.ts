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
    conversation_id: conversation.id,
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
    entities,
  } = structuredData;

  const summaryParts: string[] = [];

  // Always include the main parts
  if (title.trim()) {
    summaryParts.push(`Title: ${title}`);
  }
  if (overallSummary.trim()) {
    summaryParts.push(`Summary: ${overallSummary}`);
  }
  if (userIntent.trim()) {
    summaryParts.push(`User Intent: ${userIntent}`);
  }
  if (keyTopics?.length > 0) {
    summaryParts.push(`Key Topics: ${keyTopics.join(', ')}`);
  }
  if (entities?.length > 0) {
    const entityLines = entities.map((entity) => `- ${entity.type}: ${entity.name}`).join('\n');
    summaryParts.push(`Entities:\n${entityLines}`);
  }
  if (agentActions?.length > 0) {
    const actionLines = agentActions.map((item) => ` - ${item}`).join('\n');
    summaryParts.push(`Agent Actions:\n${actionLines}`);
  }
  if (outcomesAndDecisions?.length > 0) {
    const outcomeLines = outcomesAndDecisions.map((item) => ` - ${item}`).join('\n');
    summaryParts.push(`Outcomes and Decisions:\n${outcomeLines}`);
  }
  if (unansweredQuestions?.length > 0) {
    const questionLines = unansweredQuestions.map((item) => ` - ${item}`).join('\n');
    summaryParts.push(`Unanswered Questions:\n${questionLines}`);
  }

  return summaryParts.join('\n\n');
};
