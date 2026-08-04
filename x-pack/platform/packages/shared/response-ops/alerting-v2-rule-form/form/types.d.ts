import type { RuleKind, RecoveryStrategy, NoDataStrategy } from '@kbn/alerting-v2-schemas';
import type { ActionFormValue } from '../actions_form';
export type { RuleKind, RecoveryStrategy, NoDataStrategy };
/** Alert / recovery delay segment control (matches `AlertDelayField` / `RecoveryDelayField`). */
export declare const DELAY_MODE: {
    readonly immediate: "immediate";
    readonly breaches: "breaches";
    readonly recoveries: "recoveries";
    readonly duration: "duration";
};
export type StateTransitionDelayMode = (typeof DELAY_MODE)[keyof typeof DELAY_MODE];
export interface ComposedQuery {
    format: 'composed';
    base: string;
    breach: {
        segment: string;
    };
    recovery?: {
        segment: string;
    };
}
export interface StandaloneQuery {
    format: 'standalone';
    no_data?: {
        query: string;
    };
    breach: {
        query: string;
    };
    recovery?: {
        query: string;
    };
}
export type RuleQuery = ComposedQuery | StandaloneQuery;
export interface RuleMetadata {
    name: string;
    enabled: boolean;
    description?: string;
    owner?: string;
    tags?: string[];
}
export interface RuleSchedule {
    every: string;
    lookback: string;
}
export interface RuleGrouping {
    fields: string[];
}
export interface RuleArtifact {
    id: string;
    type: string;
    value: string;
}
export interface RuleNotificationsValue {
    workflows: ActionFormValue;
}
export interface StateTransition {
    pendingCount?: number | null;
    pendingTimeframe?: string | null;
    recoveringCount?: number | null;
    recoveringTimeframe?: string | null;
}
export interface FormValues {
    kind: RuleKind;
    metadata: RuleMetadata;
    timeField: string;
    schedule: RuleSchedule;
    query: RuleQuery;
    recoveryStrategy?: RecoveryStrategy;
    noDataStrategy?: NoDataStrategy;
    grouping?: RuleGrouping;
    stateTransition?: StateTransition;
    stateTransitionAlertDelayMode: StateTransitionDelayMode;
    stateTransitionRecoveryDelayMode: StateTransitionDelayMode;
    artifacts?: RuleArtifact[];
    notifications?: RuleNotificationsValue;
    runbookArtifacts?: RuleArtifact[];
    dashboardArtifacts?: RuleArtifact[];
}
