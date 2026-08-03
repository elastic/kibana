import type { FormValues, StateTransition } from '../types';
/** Derives alert-delay mode from persisted `state_transition`. */
export declare const deriveAlertDelayModeFromStateTransition: (stateTransition?: StateTransition | null) => FormValues["stateTransitionAlertDelayMode"];
/** Derives recovery-delay mode from persisted `state_transition`. */
export declare const deriveRecoveryDelayModeFromStateTransition: (stateTransition?: StateTransition | null) => FormValues["stateTransitionRecoveryDelayMode"];
