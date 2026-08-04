/**
 * Why a rule run fell back to the Elasticsearch API key instead of a UIAM key.
 * These are orthogonal reasons for the same event, so they live as an attribute
 * on a single counter (summing across them yields the total ES-key fallbacks).
 */
export type UiamApiKeyFallbackReason = 'user_created_key' | 'likely_non_cloud_user' | 'unexpected';
declare class AlertingUiamTelemetry {
    private readonly meter;
    private readonly uiamApiKeyFallbackCounter;
    constructor();
    recordUiamApiKeyFallback: (reason: UiamApiKeyFallbackReason) => void;
}
export declare const alertingUiamTelemetry: AlertingUiamTelemetry;
export {};
