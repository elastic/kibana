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
  UserIdAndName,
} from '@kbn/onechat-common';
import { ConversationRoundStepType } from '@kbn/onechat-common';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
} from '../../../common/conversations';
import type { ConversationProperties } from './storage';
import type { PersistentConversationRound, PersistentConversationRoundStep } from './types';

export type Document = Pick<GetResponse<ConversationProperties>, '_source' | '_id'>;

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
    steps: round.steps.map<ConversationRoundStep>((step) => {
      if (step.type === ConversationRoundStepType.toolCall) {
        return {
          ...step,
          results: JSON.parse(step.results),
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
  return {
    ...base,
    rounds: deserializeStepResults(document._source!.rounds),
  };
};

export const fromEsWithoutRounds = (document: Document): ConversationWithoutRounds => {
  return convertBaseFromEs(document);
};

export const toEs = (conversation: Conversation): ConversationProperties => {
  return {
    agent_id: conversation.agent_id,
    user_id: conversation.user.id,
    user_name: conversation.user.username,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    rounds: serializeStepResults(conversation.rounds),
  };
};

export const updateConversation = ({
  conversation,
  update,
  updateDate,
}: {
  conversation: Conversation;
  update: ConversationUpdateRequest;
  updateDate: Date;
}) => {
  const updated = {
    ...conversation,
    ...update,
    updatedAt: updateDate.toISOString(),
  };

  return updated;
};

export const createRequestToEs = ({
  conversation,
  currentUser,
  creationDate,
}: {
  conversation: ConversationCreateRequest;
  currentUser: UserIdAndName;
  creationDate: Date;
}): ConversationProperties => {
  return {
    agent_id: conversation.agent_id,
    user_id: currentUser.id,
    user_name: currentUser.username,
    title: conversation.title,
    created_at: creationDate.toISOString(),
    updated_at: creationDate.toISOString(),
    rounds: serializeStepResults(conversation.rounds),
  };
};
