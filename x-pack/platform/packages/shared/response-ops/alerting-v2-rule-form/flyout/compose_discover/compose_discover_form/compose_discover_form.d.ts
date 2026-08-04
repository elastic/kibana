import React from 'react';
import type { ComposeDiscoverState, ComposeDiscoverAction, RecoveryType, StepDefinition, StepRenderProps } from '../types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
interface Props {
    state: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    services: RuleFormServices;
    onRecoveryTypeChange: (type: RecoveryType) => void;
    onKindChange: (kind: 'signal' | 'alert') => void;
    isEditing: boolean;
    ruleId?: string;
    builderType?: string;
    onManualSplit?: () => void;
}
interface ResolvedSteps {
    steps: StepDefinition[];
    renderCustomRecovery?: StepRenderProps['renderCustomRecovery'];
}
export declare const getSteps: (isAlert: boolean, builderType?: string) => ResolvedSteps;
export declare const ComposeDiscoverForm: ({ state, dispatch, services, onRecoveryTypeChange, onKindChange, isEditing, ruleId, builderType, onManualSplit, }: Props) => React.JSX.Element;
export {};
