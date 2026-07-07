/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData } from '@kbn/alerting-v2-schemas';

export interface BuildFlowRuleOptions {
  name: string;
  /** Ordered sequence of rule IDs, e.g. [A, B, C] for A -> B -> C. Minimum 2.
   * No AND/OR per stage yet — one rule per position. */
  ruleIds: string[];
  /** One window per hop, `hopWindows[i]` bounds the gap between `ruleIds[i]`
   * and `ruleIds[i + 1]`. Length must be `ruleIds.length - 1`. Duration
   * strings, e.g. '5m', '1h', '24h' — each relationship gets its own window,
   * they are NOT a single global sequence window. */
  hopWindows: string[];
  /**
   * When set, correlate stages by entity instead of firing on any matching
   * instances globally — every stage's rule must declare the exact same
   * `grouping.fields` for this to work (see build_flow_rule README notes on
   * `group_hash`). The field name itself is only used for UI display /
   * validation; it never appears in the generated ES|QL, which keys off the
   * platform's own `group_hash` column instead (see module doc below for
   * why). Omit for today's default: fires for any matching instances,
   * globally, uncorrelated.
   */
  correlateBy?: string;
  /**
   * Which stage's own recovery governs the flow rule's recovery — defaults
   * to the last stage (today's only behavior). Exposed now so a future
   * "recovers when: [stage picker]" UI is a clean addition, not a rework;
   * no UI sets this yet.
   */
  recoveryRuleId?: string;
}

const escapeEsqlStringLiteral = (value: string) => value.replace(/"/g, '\\"');

const DURATION_RE = /^(\d+)(ms|s|m|h|d|w)$/;
const DURATION_UNIT_TO_SECONDS: Record<string, number> = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

const durationToSeconds = (value: string): number => {
  const match = DURATION_RE.exec(value);
  if (!match) {
    throw new Error(`Invalid duration "${value}", expected e.g. "5m", "1h", "24h"`);
  }
  return Number(match[1]) * DURATION_UNIT_TO_SECONDS[match[2]];
};

/**
 * v2 alerting doesn't maintain a stable episode/group_hash across executions
 * for ungrouped queries (each run gets a fresh one, so episodes can never
 * progress past "pending" or be recognized as "still active" for recovery
 * purposes) — a known platform limitation, not specific to flow rules. Every
 * *uncorrelated* flow rule declares this single constant grouping key so its
 * episode identity is stable across runs.
 *
 * Correlated flows (see `correlateBy`) instead group by the real `group_hash`
 * column already present on every `.rule-events` doc. `group_hash` is
 * computed server-side as `sha256(groupFields.join('|') + '|' +
 * groupFields.map(f => rowDoc[f]).join('|'))` (see
 * `server/lib/rule_executor/build_alert_events.ts`, `buildGroupHash`) — a
 * pure function of the grouping field names/values, with no rule ID baked
 * in. That means two *different* stage rules that both declare
 * `grouping: { fields: ['host.name'] }` produce the identical `group_hash`
 * for the same host, which is exactly the correlation key we want, already
 * computed and already a queryable top-level `keyword` column. This is a
 * deliberate v1 choice: it requires every stage's `grouping.fields` to match
 * *exactly* (order included), which can't express partial/per-hop
 * correlation (e.g. an ungrouped root-cause stage feeding two grouped
 * downstream stages) — real field-value correlation would need either a new
 * top-level mapped field populated at write time, or `METADATA _source` +
 * extraction (both viable, deliberately deferred; ES|QL cannot reliably
 * `STATS`/`SORT`/compare on `.rule-events`' `data` column directly, since
 * it's mapped as `flattened` and Kibana's own ES|QL tooling excludes
 * flattened sub-fields from grouping and sorting).
 */
const FLOW_GROUP_FIELD = 'flow_group';
const FLOW_GROUP_VALUE = 'flow';
const CORRELATION_GROUP_FIELD = 'group_hash';

const stageColumn = (index: number) => `t${index}`;

/**
 * N-stage flow query: an ordered sequence of rule IDs, no AND/OR within a
 * stage yet (one rule per position — that's a follow-up). Generalizes the
 * two-rule case: one column per stage, then a chain of
 * `t(n) > t(n-1) AND DATE_DIFF(...) <= hopWindows[n-1]` comparisons — each
 * hop has its own independently configurable window, not one global window
 * for the whole sequence.
 *
 * Uses `VALUES(CASE(...))` (collect every occurrence) + `MV_EXPAND` per stage
 * — not `MAX(CASE(...))` — deliberately. `MAX` alone only compares each
 * stage's single *latest* occurrence within the lookback, which silently
 * breaks the moment any stage fires more than once in the window (the normal
 * lifecycle for a persistently-breaching rule, not an edge case): a genuine
 * "A at 0:00, then B at 0:05" pattern would be missed if A later re-fires at
 * 0:20, since MAX(A)=0:20 no longer precedes B. Expanding every stage's full
 * occurrence list produces the cross-product of all (t0, t1, ..., tn) tuples
 * for the group, so the final WHERE correctly finds *any* qualifying
 * sequence of occurrences, not just whichever happened most recently.
 * Verified against a live repro of the MAX-only false negative before
 * shipping this — see dev/rule-chaining-poc history.md, 2026-07-06.
 */
export const buildFlowSequenceEsql = ({
  ruleIds,
  hopWindows,
  correlateBy,
}: Pick<BuildFlowRuleOptions, 'ruleIds' | 'hopWindows' | 'correlateBy'>): string => {
  if (ruleIds.length < 2) {
    throw new Error('buildFlowSequenceEsql requires at least 2 rule IDs');
  }
  if (hopWindows.length !== ruleIds.length - 1) {
    throw new Error('hopWindows must have exactly ruleIds.length - 1 entries');
  }
  const ids = ruleIds.map(escapeEsqlStringLiteral);
  const columns = ids.map((_, i) => stageColumn(i));

  const statsColumns = ids
    .map((id, i) => `${columns[i]} = VALUES(CASE(rule.id == "${id}", @timestamp, NULL))`)
    .join(',\n        ');

  const mvExpandLines = columns.map((c) => `| MV_EXPAND ${c}`).join('\n');

  const notNullChecks = columns.map((c) => `${c} IS NOT NULL`).join(' AND ');
  const hopChecks = columns
    .slice(1)
    .map((c, i) => {
      const prev = columns[i];
      const hopSeconds = Math.ceil(durationToSeconds(hopWindows[i]));
      return `${c} > ${prev} AND DATE_DIFF("seconds", ${prev}, ${c}) <= ${hopSeconds}`;
    })
    .join(' AND ');

  const groupByField = correlateBy ? CORRELATION_GROUP_FIELD : FLOW_GROUP_FIELD;

  return [
    'FROM .rule-events',
    `| WHERE type == "alert" AND rule.id IN (${ids.map((id) => `"${id}"`).join(', ')})`,
    ...(correlateBy ? [] : [`| EVAL ${FLOW_GROUP_FIELD} = "${FLOW_GROUP_VALUE}"`]),
    `| STATS ${statsColumns}`,
    `        BY ${groupByField}`,
    mvExpandLines,
    `| WHERE ${notNullChecks} AND ${hopChecks}`,
  ].join('\n');
};

/**
 * Recovery is intentionally decoupled from the trigger condition: once the
 * flow has fired, earlier stages aging out of the lookback shouldn't clear
 * it — only the governing stage (defaults to the last one in the sequence)
 * recovering should. Rows returned here mean "recovered" (opposite polarity
 * from the breach query), per `CreateRecoveryEventsStep`.
 *
 * Uncorrelated: the governing rule's own most recent event already carries a
 * top-level `status` of "breached" or "recovered", so this just checks that
 * latest status directly (global, not per-entity).
 *
 * Correlated: a global "most recent event" check can't work per-entity — it
 * would recover every entity whenever any one of them recovers. Instead,
 * emit one row per `group_hash` whose most recent event for the governing
 * rule is "recovered" (i.e. no *later* non-recovered event exists for that
 * entity), which is exactly what `CreateRecoveryEventsStep` needs to match
 * against the correlated flow rule's active per-entity episodes.
 */
export const buildFlowRecoveryEsql = ({
  ruleIds,
  correlateBy,
  recoveryRuleId,
}: Pick<BuildFlowRuleOptions, 'ruleIds' | 'correlateBy' | 'recoveryRuleId'>): string => {
  const governingRuleId = escapeEsqlStringLiteral(recoveryRuleId ?? ruleIds[ruleIds.length - 1]);

  if (correlateBy) {
    return [
      'FROM .rule-events',
      `| WHERE type == "alert" AND rule.id == "${governingRuleId}"`,
      '| STATS latest_recovered = MAX(CASE(status == "recovered", @timestamp, NULL)),',
      '        latest_any       = MAX(@timestamp)',
      `        BY ${CORRELATION_GROUP_FIELD}`,
      '| WHERE latest_recovered == latest_any',
    ].join('\n');
  }

  return [
    'FROM .rule-events',
    `| WHERE type == "alert" AND rule.id == "${governingRuleId}"`,
    '| SORT @timestamp DESC',
    '| LIMIT 1',
    `| EVAL ${FLOW_GROUP_FIELD} = "${FLOW_GROUP_VALUE}"`,
    '| WHERE status == "recovered"',
  ].join('\n');
};

/**
 * The rule's own schedule.lookback must cover the full span of the sequence
 * (sum of all hop windows) — each hop's own DATE_DIFF check is what actually
 * enforces the per-relationship window; the lookback just needs to be large
 * enough that STATS can still see the earliest stage's event when the latest
 * one comes in. Formatted in seconds to avoid unit-rounding surprises.
 */
const buildTotalLookback = (hopWindows: string[]): string => {
  const totalSeconds = hopWindows.reduce((sum, w) => sum + durationToSeconds(w), 0);
  return `${Math.ceil(totalSeconds)}s`;
};

export const buildFlowRuleData = ({
  name,
  ruleIds,
  hopWindows,
  correlateBy,
  recoveryRuleId,
}: BuildFlowRuleOptions): CreateRuleData => ({
  kind: 'alert',
  metadata: { name, tags: ['flow'] },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: buildTotalLookback(hopWindows) },
  query: {
    format: 'standalone',
    breach: { query: buildFlowSequenceEsql({ ruleIds, hopWindows, correlateBy }) },
    recovery: { query: buildFlowRecoveryEsql({ ruleIds, correlateBy, recoveryRuleId }) },
  },
  recovery_strategy: 'query',
  grouping: { fields: [correlateBy ? CORRELATION_GROUP_FIELD : FLOW_GROUP_FIELD] },
  state_transition: { pending_count: 1, recovering_count: 1 },
});
