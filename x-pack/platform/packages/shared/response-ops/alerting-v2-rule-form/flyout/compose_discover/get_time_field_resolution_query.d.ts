import type { RuleQuery } from '../../form/types';
/**
 * Returns the ES|QL query used to resolve index date fields for time-field
 * selection. Uses the base query in alert (tracking) mode and the full breach
 * query in signal mode. Standalone alerts have no base, so they fall back to
 * the breach query (FROM is still extracted before field caps). Empty when the
 * query is not committed or has no FROM.
 */
export declare function getTimeFieldResolutionQuery(query: RuleQuery, isAlert: boolean, queryCommitted: boolean): string;
