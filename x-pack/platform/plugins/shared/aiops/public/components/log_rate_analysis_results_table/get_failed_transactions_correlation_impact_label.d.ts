declare const CORRELATIONS_IMPACT_THRESHOLD: {
    readonly HIGH: string;
    readonly MEDIUM: string;
    readonly LOW: string;
    readonly VERY_LOW: string;
};
type FailedTransactionsCorrelationsImpactThreshold = (typeof CORRELATIONS_IMPACT_THRESHOLD)[keyof typeof CORRELATIONS_IMPACT_THRESHOLD];
export declare function getFailedTransactionsCorrelationImpactLabel(pValue: number | null, isFallbackResult?: boolean): {
    impact: FailedTransactionsCorrelationsImpactThreshold;
    color: string;
} | null;
export {};
