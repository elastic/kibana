import type { RuleKind } from './compose_form_types';
import type { StepId, ComposeDiscoverState, ComposeDiscoverAction, ComposeDiscoverMode, SandboxTabConfig, RecoveryType } from './types';
export declare const getStepIds: (tracking: boolean) => StepId[];
export interface InitialStateConfig {
    mode: ComposeDiscoverMode;
    initialKind?: RuleKind;
    initialRecoveryType?: RecoveryType;
}
export declare const createInitialState: ({ mode, initialKind, initialRecoveryType, }: InitialStateConfig) => ComposeDiscoverState;
/**
 * Returns the SandboxTabConfig for the current state.
 *
 * alertCondition    + tracking  → base-alert
 * recoveryCondition + custom    → base-recovery
 * everything else               → single
 */
export declare function getSandboxTabConfig(state: ComposeDiscoverState): SandboxTabConfig;
export declare function reducer(state: ComposeDiscoverState, action: ComposeDiscoverAction): ComposeDiscoverState;
export declare const useComposeDiscoverState: (config: InitialStateConfig) => [ComposeDiscoverState, import("react").Dispatch<ComposeDiscoverAction>];
