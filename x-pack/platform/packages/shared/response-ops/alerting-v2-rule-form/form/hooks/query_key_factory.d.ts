/**
 * React Query key factory for the rule form.
 *
 * Centralises cache keys so queries can be invalidated or matched consistently.
 *
 * The preview key intentionally does **not** include a caller-specific segment
 * (e.g. 'rulePreview' vs 'recoveryPreview'). When two previews resolve to the
 * same ES|QL query + timeField + lookback, they share a single cache entry so
 * React Query deduplicates the request and both consumers receive identical
 * data. This prevents the subtle bug where two independent fetches of the same
 * query compute slightly different `Date.now()` time windows and return
 * different rows.
 */
export declare const ruleFormKeys: {
    all: readonly ["ruleForm"];
    preview: (query: string, timeField: string, lookback: string) => readonly ["ruleForm", "preview", string, string, string];
    queryColumns: (query: string) => readonly ["ruleForm", "queryColumns", string];
    dataFields: (query: string) => readonly ["ruleForm", "dataFields", string];
};
