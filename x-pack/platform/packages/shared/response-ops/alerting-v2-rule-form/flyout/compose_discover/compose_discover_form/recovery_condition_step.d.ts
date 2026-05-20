import React from 'react';
import type { ComposeDiscoverAction, ComposeDiscoverState, RecoveryType } from '../types';
interface RecoveryConditionStepProps {
    state: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    onRecoveryTypeChange: (type: RecoveryType) => void;
}
export declare function RecoveryConditionStep({ state, dispatch, onRecoveryTypeChange, }: RecoveryConditionStepProps): React.JSX.Element;
export {};
