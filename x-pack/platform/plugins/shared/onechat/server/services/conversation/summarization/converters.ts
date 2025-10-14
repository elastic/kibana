/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import { type Conversation, type UserIdAndName } from '@kbn/onechat-common';
import type { ConversationSummaryProperties } from './storage';
import type { ConversationSummary } from './types';

export type Document = Pick<GetResponse<ConversationSummaryProperties>, '_source' | '_id'>;

export const createConversationSummary = ({
  conversation,
  user,
  summary,
  spaceId,
  createdAt = new Date(),
  updatedAt = createdAt,
}: {
  conversation: Conversation;
  user: UserIdAndName;
  summary: string;
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
    summary,
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString(),
  };
};

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
    summary: document._source.summary,
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
    summary: summary.summary,
  };
};
