import type { RuleQuery } from '../../form/types';
export type SplitConfidence = 'high' | 'low' | 'none';
export interface SplitResult {
    base: string;
    alertBlock: string;
    confidence: SplitConfidence;
    /**
     * Machine-readable reason for the confidence level, useful for downstream
     * branching without string-matching the human-readable messages.
     *
     * - 'no_stats'           — no STATS and no WHERE; entire query is base
     * - 'no_where'           — STATS found but no WHERE after it; alert block is absent
     * - 'split_succeeded'    — both STATS and a post-STATS WHERE were found
     * - 'where_without_stats' — no STATS but a WHERE exists; split at the last WHERE
     */
    reason: 'no_stats' | 'no_where' | 'split_succeeded' | 'where_without_stats';
}
/**
 * Splits an ES|QL query into a base portion and an alert-condition block
 * using the ANTLR-based AST parser from `@elastic/esql`.
 *
 * Heuristic (three rules, evaluated in order):
 *
 * 1. If there is at least one WHERE after a STATS, split directly before
 *    the first WHERE after the last STATS.
 * 2. If there is at least one WHERE but no STATS, split directly after
 *    the last non-WHERE command that precedes the last WHERE. Consecutive
 *    trailing WHEREs all become part of the alert block.
 * 3. Otherwise (no WHERE, or only WHEREs before a STATS), we cannot
 *    determine the split — the entire query is the base, alert block is
 *    empty.
 *
 * Parsing uses the real AST, so pipes inside string literals, comments,
 * or other lexical contexts are handled correctly.
 */
export declare function splitQuery(query: string): SplitResult;
/** Splits a full ES|QL query (e.g. from Discover) into composed base + breach segment. */
export declare function discoverQueryToComposed(inlinedQuery: string): {
    format: 'composed';
    base: string;
    breach: {
        segment: string;
    };
};
/**
 * Outcome of splitting a unified query for the form summary:
 *
 * - 'success'            — base and alert condition both identified
 * - 'no_alert_condition' — base defined, no alert condition (every row is a breach)
 * - 'split_failed'       — heuristic could not isolate a base (empty base)
 * - 'empty'              — no query entered
 */
export type SplitOutcome = 'success' | 'no_alert_condition' | 'split_failed' | 'empty';
export interface SplitRuleQueryResult {
    query: RuleQuery;
    outcome: SplitOutcome;
}
/**
 * Maps a unified ES|QL query into the rule query shape for an alert rule,
 * alongside an outcome that drives the form summary copy/callouts.
 *
 * - `success` (base + alert condition) → `composed` (base + breach segment).
 * - `no_alert_condition` (base only, no WHERE) → `standalone`: the whole query
 *   is the breach query, so every returned row is a breach. The rule data schema
 *   permits `alert + standalone` (only `signal` is forced to standalone), so this
 *   is a first-class, savable rule rather than a blocked dead-end.
 * - `split_failed` / `empty` → `composed` so the summary can flag the state; these
 *   do not produce a savable base-only rule.
 */
export declare function splitResultToRuleQuery(fullQuery: string): SplitRuleQueryResult;
/**
 * After a create-mode unified-editor Apply, merges heuristic split output with
 * any recovery block from the sandbox when the query format is unchanged.
 * A format change (e.g. standalone no_where → composed after adding WHERE) drops recovery.
 */
export declare function resolveUnifiedAlertApplyQuery(sandboxQuery: RuleQuery, splitResult: RuleQuery): RuleQuery;
/**
 * Produces a candidate recovery block from an alert block by performing a
 * naive per-operator flip of comparison operators (`>` ↔ `<`, `>=` ↔ `<=`).
 * Uses a single-pass regex substitution to avoid the double-replacement bug
 * that arises from sequential `.replace()` calls on overlapping patterns
 * (e.g. `>=` being matched by both `>=` and `>`).
 *
 * **Important:** This is NOT a logical negation (De Morgan's law). For
 * compound expressions like `a > 1 AND b < 2`, the true negation would be
 * `a <= 1 OR b >= 2` — but this function produces `a < 1 AND b > 2`
 * (flips each operator independently, preserves AND/OR connectives). For
 * single-condition alert blocks this is usually what users want operationally,
 * and it works well as a starting seed for the Recovery query editor.
 */
export declare function guessRecoveryBlock(alertBlock: string): string;
