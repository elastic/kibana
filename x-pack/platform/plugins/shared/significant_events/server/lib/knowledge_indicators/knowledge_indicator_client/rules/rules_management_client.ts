/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Ownership tag every Nightshift-managed rule carries: `nightshift:source:<sourceId>`. */
export const NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX = 'nightshift:source:' as const;

/**
 * Ownership tag written before knowledge indicators were keyed by source
 * (`sigevents:stream:<streamName>`). Those rules are still "owned": the
 * documents that backed them are invisible after the re-keying, so the
 * routine orphan sweep (`reconcileSource`) retires them, and the cluster-wide
 * `POST /internal/significant_events/knowledge_indicators/_reset` deletes them
 * outright. A source id equals the stream name while streams are the source
 * universe, which is what lets the two tags be matched per source.
 */
export const LEGACY_RULE_STREAM_TAG_PREFIX = 'sigevents:stream:' as const;

export type RuleOwnershipTagPrefix =
  | typeof NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX
  | typeof LEGACY_RULE_STREAM_TAG_PREFIX;

export const RULE_OWNERSHIP_TAG_PREFIXES: readonly RuleOwnershipTagPrefix[] = [
  NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX,
  LEGACY_RULE_STREAM_TAG_PREFIX,
];

export const toSourceTag = (sourceId: string): string =>
  `${NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX}${sourceId}`;

export const toLegacyStreamTag = (sourceId: string): string =>
  `${LEGACY_RULE_STREAM_TAG_PREFIX}${sourceId}`;

/** Source id carried by either ownership tag, or `undefined` for unrelated tags. */
export const sourceIdFromOwnershipTag = (tag: string): string | undefined => {
  const prefix = RULE_OWNERSHIP_TAG_PREFIXES.find((candidate) => tag.startsWith(candidate));
  return prefix ? tag.slice(prefix.length) : undefined;
};

/**
 * Narrow interface that decouples `QueryRuleOrchestrator` from the Alerting v2 client.
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

  /**
   * Rule ids owned by a source, i.e. tagged `nightshift:source:<sourceId>` or
   * with the legacy `sigevents:stream:<sourceId>` tag, in the client's space.
   */
  findOwnedRuleIds(sourceId: string): Promise<string[]>;

  /**
   * Distinct source ids owning at least one rule (either ownership tag), so
   * orphan-rule cleanup can reach sources whose rules outlived all of their
   * knowledge indicators.
   */
  findSourceIdsWithOwnedRules(): Promise<string[]>;

  /**
   * Every rule id carrying a tag that starts with `prefix`, in the space the
   * client is bound to. Used by the cluster-wide reset.
   */
  findRuleIdsByTagPrefix(prefix: RuleOwnershipTagPrefix): Promise<string[]>;
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
