import type { RuleKind } from '../../form/types';
import type { StepId, ComposeDiscoverState, ComposeDiscoverAction, ComposeDiscoverMode, QueryTab, RecoveryType } from './types';
export declare const getStepIds: (isAlert: boolean) => StepId[];
export declare const getBuilderStepIds: (isAlert: boolean) => StepId[];
export interface InitialStateConfig {
    mode: ComposeDiscoverMode;
    initialKind?: RuleKind;
    initialRecoveryType?: RecoveryType;
    /** When true, the query is already populated (e.g. from Discover) and the sandbox gate is skipped. */
    isQueryPrePopulated?: boolean;
    /** When true, the flyout opens directly in YAML mode with the sandbox open. */
    forceYamlMode?: boolean;
}
export declare const createInitialState: ({ mode, initialKind, initialRecoveryType, isQueryPrePopulated, forceYamlMode, }: InitialStateConfig) => ComposeDiscoverState;
/**
 * Returns the tabs to show in the Sandbox for the current step.
 *
 * create/edit/clone + alertCondition + manualSplitEnabled → ['base', 'alert']
 * create/edit/clone + alertCondition                      → undefined (unified editor; create runs heuristic on Apply)
 * isAlert + recoveryCondition  + custom                 → ['recovery']
 * everything else                                         → undefined (single editor)
 */
export declare function getSandboxTabs(isAlert: boolean, state: Pick<ComposeDiscoverState, 'step' | 'recoveryType' | 'mode' | 'manualSplitEnabled'>): QueryTab[] | undefined;
export declare function reducer(state: ComposeDiscoverState, action: ComposeDiscoverAction): ComposeDiscoverState;
export declare const useComposeDiscoverState: (config: InitialStateConfig) => [ComposeDiscoverState, import("react").Dispatch<ComposeDiscoverAction>];
