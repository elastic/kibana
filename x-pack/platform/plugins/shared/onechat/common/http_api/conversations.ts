/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationWithoutRounds, UserIdAndName } from '@kbn/onechat-common';

export interface ListConversationsResponse {
  results: ConversationWithoutRounds[];
}

export interface DeleteConversationResponse {
  success: boolean;
}

export interface RenameConversationResponse {
  id: string;
  title: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  agent_id: string;
  created_at: string;
  user: UserIdAndName;
  tokens_in: number;
  tokens_out: number;
  rounds_count: number;
  tool_calls_count: number;
  connector_ids: string[];
}

export interface MonitoringAggregates {
  total_tokens_in: number;
  total_tokens_out: number;
  total_messages: number;
  total_tool_calls: number;
}

export interface MonitoringListConversationsResponse {
  conversations: ConversationSummary[];
  aggregates: MonitoringAggregates;
}

export interface MonitoringConversationMetadata {
  total_tokens_in: number;
  total_tokens_out: number;
  total_rounds: number;
  total_tool_calls: number;
  connector_ids: string[];
  connector_usage: Record<string, { tokens_in: number; tokens_out: number }>;
}

export interface MonitoringConversationResponse extends Conversation {
  monitoring_metadata: MonitoringConversationMetadata;
}
