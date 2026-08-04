import React from 'react';
import type { ComposeDiscoverAction, ComposeDiscoverState, CustomRecoveryRenderProps, RecoveryType } from '../types';
interface RecoveryConditionStepProps {
    state: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    onRecoveryTypeChange: (type: RecoveryType) => void;
    renderCustomRecovery?: (props: CustomRecoveryRenderProps) => React.ReactNode;
}
export declare function RecoveryConditionStep({ state, dispatch, onRecoveryTypeChange, renderCustomRecovery, }: RecoveryConditionStepProps): React.JSX.Element;
export {};
