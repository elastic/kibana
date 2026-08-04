interface QueryFieldRulesProps {
    queryCommitted: boolean;
}
/**
 * Always-mounted registration for the `query` field so `trigger(['query'])`
 * works even when AlertConditionStep is not the visible step (or is suspended).
 * Keeps `queryCommitted` in a ref so validate never reads a stale closure.
 */
export declare const QueryFieldRules: ({ queryCommitted }: QueryFieldRulesProps) => null;
export {};
