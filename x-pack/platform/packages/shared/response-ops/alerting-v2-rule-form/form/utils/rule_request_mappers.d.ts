import type { RuleResponse, RecoveryPolicyType, CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import type { FormValues, StateTransition } from '../types';
type RuleArtifactPayload = Array<{
    id: string;
    type: string;
    value: string;
}>;
/** Derives alert-delay mode from persisted `state_transition` (same rules as `AlertDelayField`). */
export declare const deriveAlertDelayModeFromStateTransition: (stateTransition?: StateTransition | null) => FormValues["stateTransitionAlertDelayMode"];
/** Derives recovery-delay mode from persisted `state_transition` (same rules as `RecoveryDelayField`). */
export declare const deriveRecoveryDelayModeFromStateTransition: (stateTransition?: StateTransition | null) => FormValues["stateTransitionRecoveryDelayMode"];
/**
 * Common rule request shape shared between create and update payloads.
 * Contains all fields except `kind` (only required for create).
 */
export interface RuleRequestCommon {
    metadata: {
        name: string;
        description?: string;
        owner?: string;
        tags?: string[];
    };
    time_field: string;
    schedule: {
        every: string;
        lookback?: string;
    };
    evaluation: {
        query: {
            base: string;
        };
    };
    grouping?: {
        fields: string[];
    };
    recovery_policy?: {
        type: RecoveryPolicyType;
        query?: {
            base?: string;
        };
    };
    state_transition?: {
        pending_count?: number;
        pending_timeframe?: string;
        recovering_count?: number;
        recovering_timeframe?: string;
    };
    artifacts?: RuleArtifactPayload;
}
/**
 * Maps `FormValues` to the common API request shape (snake_case) shared by
 * both create and update endpoints. Does not include `kind`.
 */
export declare const mapFormValuesToRuleRequest: (formValues: FormValues) => RuleRequestCommon;
/**
 * Maps `FormValues` to the create API request payload.
 * Adds `kind` on top of the common request shape since it is required for creation.
 */
export declare const mapFormValuesToCreateRequest: (formValues: FormValues) => CreateRuleData;
/**
 * Maps `FormValues` to the update API request payload.
 * Coerces absent optional fields to `null` so the API interprets them as
 * explicit removals (as opposed to `undefined` which omits the key entirely).
 */
export declare const mapFormValuesToUpdateRequest: (formValues: FormValues) => UpdateRuleData;
/**
 * Maps a `RuleResponse` (API shape, snake_case) to `Partial<FormValues>` (form shape, camelCase).
 *
 * Only fields present in the response are included so the form defaults fill in the rest.
 * Use this when populating the edit form with an existing rule's data.
 */
export declare const mapRuleResponseToFormValues: (rule: RuleResponse) => Partial<FormValues>;
export {};
