/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Ownership tag every Nightshift-managed rule carries: `nightshift:source:<sourceId>`. */
export const NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX = 'nightshift:source:' as const;

/**
 * Ownership tag written before knowledge indicators were keyed by source.
 * Only the cluster-wide `_reset` route still looks for it.
 */
export const LEGACY_RULE_STREAM_TAG_PREFIX = 'sigevents:stream:' as const;

export const toSourceTag = (sourceId: string): string =>
  `${NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX}${sourceId}`;

export const sourceIdFromTag = (tag: string): string | undefined =>
  tag.startsWith(NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX)
    ? tag.slice(NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX.length)
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

  findOwnedRuleIds(sourceId: string): Promise<string[]>;

  /**
   * Distinct source ids owning at least one rule, so orphan-rule cleanup can
   * reach sources whose rules outlived all of their knowledge indicators.
   */
  findSourceIdsWithOwnedRules(): Promise<string[]>;

  /**
   * Every rule id carrying a tag that starts with `prefix`, in the space the
   * client is bound to. Used by the cluster-wide reset to find both current
   * (`nightshift:source:`) and legacy (`sigevents:stream:`) ownership tags.
   */
  findRuleIdsByTagPrefix(prefix: string): Promise<string[]>;
}

/** Engine-independent Significant Events definition translated to Alerting v2 by the adapter. */
export interface SignificantEventsRuleDefinition {
  name: string;
  sourceId: string;
  timestampField: string;
  esqlQuery: string;
  schedule: {
    interval: string;
  };
}
