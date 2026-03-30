/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConversationConsumptionWarning {
  type: 'high_input_tokens';
  round_id: string;
  input_tokens: number;
}

export interface ConversationConsumption {
  conversation_id: string;
  title: string;
  user: { id?: string; username: string };
  created_at: string;
  updated_at: string;
  token_usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  round_count: number;
  llm_calls: number;
  warnings: ConversationConsumptionWarning[];
}

export type ConsumptionSortField = 'updated_at' | 'total_tokens' | 'round_count';

export interface ConsumptionFilters {
  usernames?: string[];
  has_warnings?: boolean;
}

export interface ConsumptionAggregations {
  usernames: string[];
  total_with_warnings: number;
}

export interface ConsumptionResponse {
  results: ConversationConsumption[];
  total: number;
  search_after?: unknown[];
  aggregations?: ConsumptionAggregations;
}
