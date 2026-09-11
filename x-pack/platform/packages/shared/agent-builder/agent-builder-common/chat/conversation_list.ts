/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';

export interface ConversationListOptions {
  agentId?: string;
  page?: number;
  perPage?: number;
  sortOrder?: 'asc' | 'desc';
  pinned?: boolean;
}

/**
 * Fields a conversation search filter may reference, in KQL.
 */
export const CONVERSATION_SEARCH_FILTER_FIELDS = [
  'owner',
  'agent_id',
  'template_id',
  'event_type',
  'attachment_type',
  'attachment_id',
  'status',
  'created_at',
  'updated_at',
] as const;

export type ConversationSearchFilterField = (typeof CONVERSATION_SEARCH_FILTER_FIELDS)[number];

/** Prefix under which any template metadata key becomes filterable, as `metadata.<key>`. */
export const CONVERSATION_SEARCH_METADATA_FIELD_PREFIX = 'metadata';

/** Fields a conversation search may be sorted by. */
export const CONVERSATION_SEARCH_SORT_FIELDS = ['updated_at', 'created_at', 'title'] as const;

export type ConversationSearchSortField = (typeof CONVERSATION_SEARCH_SORT_FIELDS)[number];

export interface ConversationSearchSort {
  field: ConversationSearchSortField;
  order: 'asc' | 'desc';
}

export interface ConversationSearchOptions {
  /**
   * Free-text query matched against the conversation title.
   */
  query?: string;
  /**
   * A KQL expression representing a filter on the conversations.
   * Only the fields in {@link CONVERSATION_SEARCH_FILTER_FIELDS} and `metadata.<key>` may be referenced.
   *
   * Can be provided as a string or as an AST.
   * @example `event_type: user_message AND NOT owner: "elastic"`
   * @example
   * ```ts
   * nodeBuilder.and([
   *   nodeBuilder.is('event_type', 'user_message'),
   *   nodeTypes.function.buildNode('not', nodeBuilder.is('owner', 'elastic')),
   * ])
   * ```
   */
  filter?: string | KueryNode;
  sort?: ConversationSearchSort;
  agentId?: string;
  page?: number;
  perPage?: number;
}
