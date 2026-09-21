/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NoData,
  Query,
  ReadableQuery,
  Recovery,
  RuleKind,
  StateTransition,
  StateTransitionOperator,
} from '@kbn/alerting-v2-schemas';
import { composeEsqlQuery, hasBreachCondition } from '@kbn/alerting-v2-schemas';

/** The pre-collapse `query`, which encoded the same rule two different ways. */
export type LegacyQuery =
  | {
      format: 'composed';
      base: string;
      breach: { segment: string };
      recovery?: { segment: string };
    }
  | {
      format: 'standalone';
      breach: { query: string };
      recovery?: { query: string };
      no_data?: { query: string };
    };

export type LegacyRecoveryStrategy = 'no_breach' | 'query' | 'none';

export type LegacyNoDataStrategy = 'last_known_status' | 'emit' | 'recover' | 'none';

/** The pre-nesting `state_transition`, which held six flat scalars. */
export interface LegacyStateTransition {
  pending_operator?: StateTransitionOperator;
  pending_count?: number;
  pending_timeframe?: string;
  recovering_operator?: StateTransitionOperator;
  recovering_count?: number;
  recovering_timeframe?: string;
}

export interface LegacyRuleShape {
  kind: RuleKind;
  query: LegacyQuery;
  recovery_strategy?: LegacyRecoveryStrategy;
  no_data_strategy?: LegacyNoDataStrategy;
  state_transition?: LegacyStateTransition | null;
}

export interface CollapsedRuleShape {
  query: Query;
  recovery?: Recovery;
  no_data?: NoData;
  state_transition?: StateTransition;
}

const omitEmpty = <T extends object>(value: T): T | undefined =>
  Object.keys(value).length ? value : undefined;

/**
 * A composed rule with no breach condition stored an empty segment, which read
 * back as "every row of `base` breaches" — the same thing as omitting `breach`.
 */
const toQuery = (query: LegacyQuery): Query =>
  query.format === 'standalone'
    ? { base: query.breach.query }
    : {
        base: query.base,
        ...(query.breach.segment.trim() ? { breach: { segment: query.breach.segment } } : {}),
      };

const toRecovery = (query: LegacyQuery, strategy?: LegacyRecoveryStrategy): Recovery => {
  if (strategy === 'no_breach') {
    return { strategy: 'no_breach' };
  }

  if (strategy !== 'query' || !query.recovery) {
    return { strategy: 'manual' };
  }

  if (query.format === 'standalone') {
    return { strategy: 'query', query: query.recovery.query };
  }

  // `condition` requires a breach segment to recover against, so a blank one
  // carries the same executor behaviour over as a standalone recovery query.
  return query.breach.segment.trim()
    ? { strategy: 'condition', segment: query.recovery.segment }
    : { strategy: 'query', query: composeEsqlQuery(query.base, query.recovery.segment) };
};

const toNoData = (query: LegacyQuery, strategy?: LegacyNoDataStrategy): NoData => {
  const presenceQuery =
    query.format === 'standalone' && query.no_data ? { query: query.no_data.query } : {};

  switch (strategy) {
    case 'last_known_status':
      return { strategy: 'keep_last', ...presenceQuery };
    case 'recover':
      return { strategy: 'resolve', ...presenceQuery };
    case 'emit':
      return { strategy: 'alert', ...presenceQuery };
    default:
      return { strategy: 'ignore' };
  }
};

/**
 * `operator` combines a count with a timeframe, and the collapsed schema only
 * accepts it alongside both. The flat scalars were independently optional, so an
 * operator that never had anything to combine is dropped rather than migrated.
 */
const toPhase = (
  count?: number,
  timeframe?: string,
  operator?: StateTransitionOperator
): NonNullable<StateTransition['pending']> | undefined =>
  omitEmpty({
    ...(count != null ? { count } : {}),
    ...(timeframe != null ? { timeframe } : {}),
    ...(count != null && timeframe != null && operator != null ? { operator } : {}),
  });

const toStateTransition = (
  stateTransition?: LegacyStateTransition | null
): StateTransition | undefined => {
  if (stateTransition == null) {
    return undefined;
  }

  const {
    pending_count: pendingCount,
    pending_timeframe: pendingTimeframe,
    pending_operator: pendingOperator,
    recovering_count: recoveringCount,
    recovering_timeframe: recoveringTimeframe,
    recovering_operator: recoveringOperator,
  } = stateTransition;

  const pending = toPhase(pendingCount, pendingTimeframe, pendingOperator);
  const recovering = toPhase(recoveringCount, recoveringTimeframe, recoveringOperator);

  return omitEmpty({
    ...(pending ? { pending } : {}),
    ...(recovering ? { recovering } : {}),
  });
};

/**
 * Maps a stored rule from the two-format `query` plus flat strategy fields onto
 * the single `query` shape with `recovery` / `no_data` objects.
 *
 * Signal rules have no episodes, so their strategies are dropped rather than
 * translated.
 */
export const collapseLegacyRuleShape = (rule: LegacyRuleShape): CollapsedRuleShape => {
  const {
    kind,
    query,
    recovery_strategy: recoveryStrategy,
    no_data_strategy: noDataStrategy,
  } = rule;
  const stateTransition = toStateTransition(rule.state_transition);

  return {
    query: toQuery(query),
    ...(kind === 'alert'
      ? { recovery: toRecovery(query, recoveryStrategy), no_data: toNoData(query, noDataStrategy) }
      : {}),
    ...(stateTransition ? { state_transition: stateTransition } : {}),
  };
};

/**
 * Projects a stored `query` onto the public shape, dropping the pre-collapse
 * keys and a breach segment that carries no condition.
 */
export const toApiQuery = (query: ReadableQuery): Query => ({
  base: query.base,
  ...(hasBreachCondition(query.breach) ? { breach: { segment: query.breach.segment } } : {}),
});

/** Projects a stored `state_transition` onto the public shape, dropping the flat scalars. */
export const toApiStateTransition = (
  stateTransition?: (StateTransition & LegacyStateTransition) | null
): StateTransition | undefined =>
  stateTransition == null
    ? undefined
    : omitEmpty({
        ...(stateTransition.pending ? { pending: stateTransition.pending } : {}),
        ...(stateTransition.recovering ? { recovering: stateTransition.recovering } : {}),
      });
