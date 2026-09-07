/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAMS_RULE_STREAM_TAG_PREFIX = 'sigevents:stream:' as const;

export const toStreamTag = (streamName: string): string =>
  `${STREAMS_RULE_STREAM_TAG_PREFIX}${streamName}`;

export const streamNameFromTag = (tag: string): string | undefined =>
  tag.startsWith(STREAMS_RULE_STREAM_TAG_PREFIX)
    ? tag.slice(STREAMS_RULE_STREAM_TAG_PREFIX.length)
    : undefined;

/**
 * Narrow interface that decouples QueryClient from the Alerting v2 client.
 */
export interface IRulesManagementClient {
  /** Idempotent create: implementations should handle 409 by updating in place. */
  createRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void>;

  /** Non-breaking patch: implementations should handle 404 by creating instead. */
  updateRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void>;

  /** Best-effort bulk delete: missing rules (404) are ignored; other failures are reported. */
  bulkDeleteRules(ids: string[]): Promise<void>;

  /** Returns the subset of IDs that still resolve to live rules. */
  findExistingRuleIds(ids: string[]): Promise<string[]>;

  findOwnedRuleIds(streamName: string): Promise<string[]>;

  /**
   * Distinct stream names owning at least one rule, so orphan-rule cleanup can
   * reach streams whose rules outlived all of their knowledge indicators.
   */
  findStreamNamesWithOwnedRules(): Promise<string[]>;
}

/** Engine-independent Significant Events definition translated to Alerting v2 by the adapter. */
export interface SignificantEventsRuleDefinition {
  name: string;
  streamName: string;
  timestampField: string;
  esqlQuery: string;
  schedule: {
    interval: string;
  };
}
