/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  Conversation,
  ConversationRound,
  ConversationRoundStep,
  ConversationWithoutRounds,
  ToolResult,
  UserIdAndName,
} from '@kbn/onechat-common';
import { ConversationRoundStepType } from '@kbn/onechat-common';
import { getToolResultId } from '@kbn/onechat-server';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
  PersistentConversationRound,
  PersistentConversationRoundStep,
} from './types';
import type { ConversationProperties } from './storage';

export type Document = Pick<
  GetResponse<ConversationProperties>,
  '_source' | '_id' | '_seq_no' | '_primary_term'
>;

const convertBaseFromEs = (document: Document) => {
  if (!document._source) {
    throw new Error('No source found on get conversation response');
  }

  return {
    id: document._id,
    agent_id: document._source.agent_id,
    user: {
      id: document._source.user_id,
      username: document._source.user_name,
    },
    title: document._source.title,
    created_at: document._source.created_at,
    updated_at: document._source.updated_at,
  };
};

function serializeStepResults(rounds: ConversationRound[]): PersistentConversationRound[] {
  return rounds.map<PersistentConversationRound>((round) => ({
    ...round,
    steps: round.steps.map<PersistentConversationRoundStep>((step) => {
      if (step.type === ConversationRoundStepType.toolCall) {
        return {
          ...step,
          results: JSON.stringify(step.results),
        };
      } else {
        return step;
      }
    }),
  }));
}

function deserializeStepResults(rounds: PersistentConversationRound[]): ConversationRound[] {
  return rounds.map<ConversationRound>((round) => ({
    ...round,
    started_at: round.started_at ?? new Date(0).toISOString(),
    time_to_first_token: round.time_to_first_token ?? 0,
    time_to_last_token: round.time_to_last_token ?? 0,
    steps: round.steps.map<ConversationRoundStep>((step) => {
      if (step.type === ConversationRoundStepType.toolCall) {
        return {
          ...step,
          results: (JSON.parse(step.results) as ToolResult[]).map((result) => {
            return {
              ...result,
              tool_result_id: result.tool_result_id ?? getToolResultId(),
            };
          }),
          progression: step.progression ?? [],
        };
      } else {
        return step;
      }
    }),
  }));
}

export const fromEs = (document: Document): Conversation => {
  const base = convertBaseFromEs(document);

  // Migration: prefer legacy 'rounds' field, fallback to new 'conversation_rounds' field
  const rounds = document._source!.rounds ?? document._source!.conversation_rounds;

  return {
    ...base,
    rounds: deserializeStepResults(rounds),
  };
};

export const fromEsWithoutRounds = (document: Document): ConversationWithoutRounds => {
  return convertBaseFromEs(document);
};

export const toEs = (conversation: Conversation, space: string): ConversationProperties => {
  return {
    agent_id: conversation.agent_id,
    user_id: conversation.user.id,
    user_name: conversation.user.username,
    space,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    // Explicitly omit rounds to ensure migration
    rounds: undefined,
    conversation_rounds: serializeStepResults(conversation.rounds),
  };
};

export const updateConversation = ({
  conversation,
  update,
  space,
  updateDate,
}: {
  conversation: Conversation;
  update: ConversationUpdateRequest;
  space: string;
  updateDate: Date;
}) => {
  const updated = {
    ...conversation,
    ...update,
    space,
    updatedAt: updateDate.toISOString(),
  };

  return updated;
};

export const createRequestToEs = ({
  conversation,
  space,
  currentUser,
  creationDate,
}: {
  conversation: ConversationCreateRequest;
  currentUser: UserIdAndName;
  creationDate: Date;
  space: string;
}): ConversationProperties => {
  return {
    agent_id: conversation.agent_id,
    user_id: currentUser.id,
    user_name: currentUser.username,
    space,
    title: conversation.title,
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
    conversation_rounds: serializeStepResults(conversation.rounds),
  };
};
