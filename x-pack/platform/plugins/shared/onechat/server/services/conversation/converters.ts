/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import { type UserIdAndName, type Conversation } from '@kbn/onechat-common';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
} from '../../../common/conversations';
import { ConversationProperties } from './storage';

export type Document = Pick<GetResponse<ConversationProperties>, '_source' | '_id'>;

export const fromEs = (
  document: Pick<GetResponse<ConversationProperties>, '_source' | '_id'>
): Conversation => {
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
    rounds: document._source.rounds,
  };
};

export const toEs = (conversation: Conversation): ConversationProperties => {
  return {
    agent_id: conversation.agent_id,
    user_id: conversation.user.id,
    user_name: conversation.user.username,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    rounds: conversation.rounds,
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
    rounds: conversation.rounds,
  };
};
