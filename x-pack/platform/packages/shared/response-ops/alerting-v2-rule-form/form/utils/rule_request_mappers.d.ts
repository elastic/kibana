import type { RuleResponse, CreateRuleData, Query, UpdateRuleData, RecoveryStrategy, NoDataStrategy } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';
import { type RuleArtifactPayload } from './artifact_mappers';
/**
 * Resolves the recovery_strategy for an API request.
 * Non-query strategies (no_breach, none) are preserved as-is.
 * 'query' is always derived from the recovery block presence — never
 * kept as a stale value — because the form can add/remove recovery
 * without updating the recoveryStrategy field.
 * Signal rules never carry a recovery_strategy, regardless of what's
 * left over in the field from a previous alert/signal toggle.
 */
export declare const resolveRecoveryStrategy: (formValues: Pick<FormValues, "kind" | "recoveryStrategy" | "query">) => RecoveryStrategy | undefined;
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
    query: Query;
    recovery_strategy?: RecoveryStrategy;
    no_data_strategy?: NoDataStrategy;
    grouping?: {
        fields: string[];
    };
    state_transition?: {
        pending_count?: number;
        pending_timeframe?: string;
        recovering_count?: number;
        recovering_timeframe?: string;
    };
    artifacts?: RuleArtifactPayload;
}
export declare const mapFormValuesToRuleRequest: (formValues: FormValues) => RuleRequestCommon;
export declare const mapFormValuesToCreateRequest: (formValues: FormValues) => CreateRuleData;
export declare const mapFormValuesToUpdateRequest: (formValues: FormValues) => UpdateRuleData;
export declare const mapRuleResponseToFormValues: (rule: RuleResponse) => Partial<FormValues>;
