/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSourceSlugFromTitle } from '@kbn/nightshift-shared';

/** Ownership tag every Nightshift-managed rule carries: `nightshift:source:<slug>`. */
export const NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX = 'nightshift:source:' as const;

export class BulkCreateRulesError extends Error {
  constructor(
    public readonly cause: Error,
    public readonly createdIds: string[],
    public readonly conflictIds: string[],
    public readonly failedIds: string[]
  ) {
    super(cause.message);
    this.name = 'BulkCreateRulesError';
  }
}

/**
 * Ownership tag written before knowledge indicators were keyed by source
 * (`sigevents:stream:<streamName>`). The suffix is the raw stream name those
 * rules were created with, so it is not slugified. Current rules use
 * `nightshift:source:<slug>` instead, which is what shows up on the rule.
 */
export const LEGACY_RULE_STREAM_TAG_PREFIX = 'sigevents:stream:' as const;

export type RuleOwnershipTagPrefix =
  | typeof NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX
  | typeof LEGACY_RULE_STREAM_TAG_PREFIX;

export const RULE_OWNERSHIP_TAG_PREFIXES: readonly RuleOwnershipTagPrefix[] = [
  NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX,
  LEGACY_RULE_STREAM_TAG_PREFIX,
];

/**
 * `logs.nginx` becomes `nightshift:source:logs-nginx`. The slug is the part a
 * person reads on the rule; the source id itself may later be an opaque id.
 * Lookup still passes the source id: this function slugifies it the same way.
 */
export const toSourceTag = (sourceId: string): string =>
  `${NIGHTSHIFT_RULE_SOURCE_TAG_PREFIX}${getSourceSlugFromTitle(sourceId)}`;

export const toLegacyStreamTag = (sourceId: string): string =>
  `${LEGACY_RULE_STREAM_TAG_PREFIX}${sourceId}`;

/**
 * Rule-tag suffixes that are not their own source. A current tag stores the
 * slug (`logs-nginx`) while knowledge indicators are still keyed by the raw id
 * (`logs.nginx`). Reconciling the slug as a second source sees zero indicators
 * and deletes the rules.
 */
export const withoutSlugAliases = (
  sourceIds: readonly string[],
  ruleKeys: readonly string[]
): string[] => {
  const known = new Set(sourceIds);
  const slugs = new Set(sourceIds.map((sourceId) => getSourceSlugFromTitle(sourceId)));
  return ruleKeys.filter((key) => !known.has(key) && !slugs.has(key));
};

/**
 * Suffix of an ownership tag, or `undefined` for an unrelated tag.
 * `nightshift:source:` carries the slug. `sigevents:stream:` carries the raw stream name.
 */
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

  /** Idempotent bulk create: implementations should handle per-rule 409s by updating in place. */
  bulkCreateRules(
    rules: Array<{ id: string; definition: SignificantEventsRuleDefinition }>
  ): Promise<{ createdIds: string[] }>;

  /** Non-breaking patch: implementations should handle 404 by creating instead. */
  updateRule(id: string, definition: SignificantEventsRuleDefinition): Promise<void>;

  /** Best-effort bulk delete: missing rules (404) are ignored; other failures are reported. */
  bulkDeleteRules(ids: string[]): Promise<void>;

  /** Returns the subset of IDs that still resolve to live rules. */
  findExistingRuleIds(ids: string[]): Promise<string[]>;

  /**
   * Rule ids owned by a source, in the client's space. Matches
   * `nightshift:source:<slug>` and the legacy `sigevents:stream:<sourceId>` tag.
   */
  findOwnedRuleIds(sourceId: string): Promise<string[]>;

  /**
   * Ownership-tag suffixes for sources that still have a rule. Current tags
   * contribute the slug; legacy tags contribute the raw stream name. Callers
   * that reconcile must drop a slug when the raw source id is already known
   * ({@link withoutSlugAliases}).
   */
  findStreamNamesWithOwnedRules(): Promise<string[]>;

  /** Every rule id carrying a tag that starts with `prefix`, in the client's space. */
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
