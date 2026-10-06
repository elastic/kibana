/**
 * Why a task run fell back to the Elasticsearch API key instead of a UIAM key.
 * These are orthogonal reasons for the same event, so they live as an attribute
 * on a single counter (summing across them yields the total ES-key fallbacks).
 */
export type UiamApiKeyFallbackReason = 'user_created_key' | 'unexpected';
/**
 * Which credential a user-scoped task run authenticated with. Summing across all
 * values yields the total user-scoped task runs. Deliberately credential-agnostic
 * (not API-key specific) so future execution identities — e.g. service-account
 * tokens — extend it with new values instead of a breaking attribute rename.
 */
export type CredentialType = 'uiam_api_key' | 'es_api_key' | 'none';
/**
 * Why the run authenticated with that credential type. Set on every series so
 * grouping keys stay consistent: `provisioned` pairs with `uiam_api_key`,
 * `not_set` with `none`, `user_created_key` pairs with either key type (a task
 * whose key was supplied by the user), and the remaining values explain an
 * `es_api_key` run (project configured for ES keys, or a fallback because no
 * UIAM key was available). Shares the vocabulary of the alerting
 * `kibana.alerting.rule_run.count` counter so both metrics can be charted with
 * the same queries.
 */
export type CredentialReason = 'provisioned' | 'config' | 'user_created_key' | 'fallback_unexpected' | 'not_set';
declare class TaskManagerUiamTelemetry {
    private readonly meter;
    private readonly uiamApiKeyFallbackCounter;
    private readonly taskRunCounter;
    constructor();
    recordUiamApiKeyFallback: (reason: UiamApiKeyFallbackReason) => void;
    recordTaskRun: (credentialType: CredentialType, credentialReason: CredentialReason) => void;
}
export declare const taskManagerUiamTelemetry: TaskManagerUiamTelemetry;
export {};
