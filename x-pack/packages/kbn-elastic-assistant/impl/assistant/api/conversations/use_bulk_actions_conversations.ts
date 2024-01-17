/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { AI_ASSISTANT_API_CURRENT_VERSION } from '../common/constants';
import { HttpSetup } from '@kbn/core/public';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';
import { Conversation } from '../../../assistant_context/types';

export interface BulkActionSummary {
  failed: number;
  skipped: number;
  succeeded: number;
  total: number;
}

export interface BulkActionResult {
  updated: Conversation[];
  created: Conversation[];
  deleted: Conversation[];
  skipped: Conversation[];
}

export interface BulkActionAggregatedError {
  message: string;
  status_code: number;
  err_code?: string;
  rules: Array<{ id: string; name?: string }>;
}

export interface BulkActionAttributes {
  summary: BulkActionSummary;
  results: BulkActionResult;
  errors?: BulkActionAggregatedError[];
}

export interface BulkUpdateResponse {
  success?: boolean;
  rules_count?: number;
  attributes: BulkActionAttributes;
}

export const bulkConversationsChange = (
  http: HttpSetup,
  conversationsActions: {
    update?: Array<Omit<Conversation, 'createdAt' | 'updatedAt' | 'user'>>;
    create?: Conversation[];
    delete?: {
      ids: string[];
    };
  }
) => {
  return http.fetch<Conversation[]>(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION, {
    method: 'POST',
    version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
    body: JSON.stringify(conversationsActions),
  });
};
