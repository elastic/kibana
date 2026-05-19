import type { StepId, ComposeDiscoverState, ComposeDiscoverAction, ComposeDiscoverMode, SandboxTabConfig } from './types';
export declare const getStepIds: (tracking: boolean) => StepId[];
export interface InitialStateConfig {
    mode: ComposeDiscoverMode;
    initialQuery?: string;
    /**
     * If the persisted rule had recovery_policy.type === 'query', pass the
     * full recovery query here. createInitialState will infer that tracking
     * was active and reconstruct the split state (base / alertBlock /
     * recoveryBlock) so the edit form opens in tracking mode.
     */
    initialRecoveryQuery?: string;
}
export declare const createInitialState: ({ mode, initialQuery, initialRecoveryQuery, }: InitialStateConfig) => ComposeDiscoverState;
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
