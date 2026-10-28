/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';

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

/** Maximum length of a conversation search filter expression. */
export const CONVERSATION_SEARCH_FILTER_MAX_LENGTH = 8192;

/** Maximum number of comparison and boolean expressions a conversation search filter may contain. */
export const CONVERSATION_SEARCH_FILTER_MAX_NODES = 100;

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
   * Only the fields in {@link CONVERSATION_SEARCH_FILTER_FIELDS} and `metadata.<key>` may be
   * referenced.
   *
   * Can be provided as a string or as an AST.
   * @example `event_type: user_message AND NOT owner: "u_J1p0L7pKzXyQ"`
   * @example
   * ```ts
   * nodeBuilder.and([
   *   nodeBuilder.is('event_type', 'user_message'),
   *   nodeTypes.function.buildNode('not', nodeBuilder.is('owner', 'u_J1p0L7pKzXyQ')),
   * ])
   * ```
   */
  filter?: string | KueryNode;
  sort?: ConversationSearchSort;
  agentId?: string;
  page?: number;
  perPage?: number;
}

/** Default number of buckets a conversation count returns per `groupBy`. */
export const CONVERSATION_COUNT_DEFAULT_GROUP_SIZE = 100;

/** Maximum number of buckets a conversation count may request. */
export const CONVERSATION_COUNT_MAX_GROUP_SIZE = 1000;

/**
 * A field conversations can be bucketed by: a registry field or `metadata.<key>`.
 * Nested (`event_type`) and date (`created_at`, `updated_at`) fields are rejected at runtime.
 */
export type ConversationGroupByField =
  | ConversationSearchFilterField
  | `${typeof CONVERSATION_SEARCH_METADATA_FIELD_PREFIX}.${string}`;

export interface ConversationCountOptions {
  /**
   * Free-text query matched against the conversation title, as in {@link ConversationSearchOptions}.
   */
  query?: string;
  /**
   * KQL filter over the same fields as {@link ConversationSearchOptions.filter}.
   */
  filter?: string | KueryNode;
  agentId?: string;
  /**
   * 1 or 2 fields to bucket the matching conversations by. With 2 fields, each bucket is one
   * combination of values (a `multi_terms` aggregation).
   */
  groupBy?: ConversationGroupByField | [ConversationGroupByField, ConversationGroupByField];
  /**
   * Bucket value for conversations missing a `groupBy` field. Conversations missing a field
   * with no `missing` value are left out of the buckets, but still counted in `total`.
   */
  missing?: Partial<Record<ConversationGroupByField, string>>;
  /**
   * Maximum number of buckets. Defaults to {@link CONVERSATION_COUNT_DEFAULT_GROUP_SIZE}, capped
   * at {@link CONVERSATION_COUNT_MAX_GROUP_SIZE}.
   */
  size?: number;
}

export interface ConversationCountGroup {
  /** Bucket values keyed by the `groupBy` field name as the caller wrote it. */
  key: Record<string, string>;
  count: number;
}

export interface ConversationCountResult {
  /** Conversations matching the filter, query, and access control. Not capped at 10,000. */
  total: number;
  /** Buckets in descending count order. Empty when `groupBy` is not set. */
  groups: ConversationCountGroup[];
}
