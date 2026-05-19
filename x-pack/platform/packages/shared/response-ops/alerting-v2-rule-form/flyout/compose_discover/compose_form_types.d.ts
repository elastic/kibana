import type { RuleKind, RecoveryPolicyType } from '@kbn/alerting-v2-schemas';
export interface ComposedQuery {
    format: 'composed';
    base: string;
    blocks: {
        breach: string;
        recover?: string;
    };
}
export interface StandaloneQuery {
    format: 'standalone';
    breach: string;
    recover?: string;
}
export type RuleQuery = ComposedQuery | StandaloneQuery;
export declare function getBreachQuery(query: RuleQuery | undefined): string;
export declare function getRecoverQuery(query: RuleQuery | undefined): string;
export interface ComposeFormValues {
    kind: RuleKind;
    metadata: {
        name: string;
        enabled: boolean;
        description?: string;
        owner?: string;
        tags?: string[];
    };
    timeField: string;
    schedule: {
        every: string;
        lookback: string;
    };
    query: RuleQuery;
    grouping?: {
        fields: string[];
    };
    stateTransition?: {
        pendingCount?: number | null;
        pendingTimeframe?: string | null;
        recoveringCount?: number | null;
        recoveringTimeframe?: string | null;
    };
    stateTransitionAlertDelayMode: 'immediate' | 'breaches' | 'recoveries' | 'duration';
    stateTransitionRecoveryDelayMode: 'immediate' | 'breaches' | 'recoveries' | 'duration';
    artifacts?: Array<{
        id: string;
        type: string;
        value: string;
    }>;
}
export type { RuleKind, RecoveryPolicyType };
