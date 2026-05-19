declare const apmIndexConfigs: readonly [readonly ["error", "apm_oss.errorIndices"], readonly ["onboarding", "apm_oss.onboardingIndices"], readonly ["span", "apm_oss.spanIndices"], readonly ["transaction", "apm_oss.transactionIndices"], readonly ["metric", "apm_oss.metricsIndices"]];
type DeprecatedApmIndexConfigPaths = (typeof apmIndexConfigs)[number][1];
type DeprecatedApmIndicesSavedObjectAttributes = Partial<{
    [Property in DeprecatedApmIndexConfigPaths]: string;
}>;
export declare function updateApmOssIndexPaths(attributes: DeprecatedApmIndicesSavedObjectAttributes): Partial<{
    error: string;
    span: string;
    transaction: string;
    metric: string;
    onboarding: string;
}>;
export {};
