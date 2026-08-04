import type { RuleQuery } from '../../form/types';
/**
 * Sandbox query shape when opting into manual split.
 *
 * Uses the same {@link splitResultToRuleQuery} heuristic as unified-editor Apply
 * in create mode. When the split succeeds, pre-populates base and alert tabs;
 * otherwise the full pipeline lives in `base` with an empty alert segment so
 * the user can define the split manually (split_failed, no_alert_condition, empty).
 *
 * Preserves any custom recovery block from {@link sourceQuery}.
 */
export declare const enterManualSplitQuery: (sourceQuery: RuleQuery) => RuleQuery;
/**
 * Sandbox query shape when returning to the unified editor: the combined pipeline
 * is stored in `base` with an empty segment so `getBreachQuery` returns it verbatim.
 *
 * Preserves any custom recovery block from {@link sourceQuery}.
 */
export declare const exitManualSplitQuery: (sourceQuery: RuleQuery) => RuleQuery;
