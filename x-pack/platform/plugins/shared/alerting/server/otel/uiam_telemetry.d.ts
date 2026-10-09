/**
 * Why a rule run fell back to the Elasticsearch API key instead of a UIAM key.
 * These are orthogonal reasons for the same event, so they live as an attribute
 * on a single counter (summing across them yields the total ES-key fallbacks).
 */
export type UiamApiKeyFallbackReason = 'user_created_key' | 'likely_non_cloud_user' | 'unexpected';
/**
 * Which credential a rule run authenticated with. Summing across all values
 * yields the total rule runs. Deliberately credential-agnostic (not API-key
 * specific) so future execution identities — e.g. service-account tokens —
 * extend it with new values instead of a breaking attribute rename.
 */
export type CredentialType = 'uiam_api_key' | 'es_api_key' | 'none';
/**
 * Why the run authenticated with that credential type. Set on every series so
 * grouping keys stay consistent: `provisioned` pairs with `uiam_api_key`,
 * `not_set` with `none`, `user_created_key` pairs with either key type (a rule
 * whose key was supplied by the user), and the remaining values explain an
 * `es_api_key` run (project configured for ES keys, or a fallback because no
 * UIAM key was available).
 */
export type CredentialReason = 'provisioned' | 'config' | 'user_created_key' | 'fallback_likely_non_cloud_user' | 'fallback_unexpected' | 'not_set';
declare class AlertingUiamTelemetry {
    private readonly meter;
    private readonly uiamApiKeyFallbackCounter;
    private readonly ruleRunCounter;
    constructor();
    recordUiamApiKeyFallback: (reason: UiamApiKeyFallbackReason) => void;
    recordRuleRun: (credentialType: CredentialType, credentialReason: CredentialReason) => void;
}
export declare const alertingUiamTelemetry: AlertingUiamTelemetry;
export {};
