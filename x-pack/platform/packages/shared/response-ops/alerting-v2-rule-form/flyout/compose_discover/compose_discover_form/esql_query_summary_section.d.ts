import React from 'react';
import type { RuleQuery } from '../../../form/types';
/**
 * Read-only summary of the applied ES|QL query on step 1. The heuristic split
 * is no longer shown in the editor (unified create flow) — it is surfaced here,
 * read-only, with copy + an edit CTA. A successful split is a `composed` query
 * (base + alert segment); a base-only query with no alert condition is persisted
 * as `standalone` (the whole query is the breach query, so every row is a breach).
 */
export type EsqlSummaryState = 'before_apply' | 'success' | 'no_alert_condition' | 'split_failed' | 'empty';
/**
 * Derives the summary state from the committed query. Callout priority is
 * encoded by the branch order: empty → split failed → no alert condition.
 */
export declare const getEsqlSummaryState: (queryCommitted: boolean, query: RuleQuery) => EsqlSummaryState;
interface EsqlQuerySummarySectionProps {
    query: RuleQuery;
    queryCommitted: boolean;
    /** Disables the edit CTA while the sandbox is already open. */
    isEditorOpen: boolean;
    onOpenEditor: () => void;
    /** When provided, shown as a CTA inside the split-failed callout. */
    onManualSplit?: () => void;
}
export declare const EsqlQuerySummarySection: React.FC<EsqlQuerySummarySectionProps>;
export {};
