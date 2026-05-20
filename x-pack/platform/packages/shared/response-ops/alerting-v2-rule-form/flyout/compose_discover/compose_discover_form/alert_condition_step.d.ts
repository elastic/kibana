import React from 'react';
import type { ComposeDiscoverAction, ComposeDiscoverState } from '../types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
interface AlertConditionStepProps {
    state: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    services: RuleFormServices;
}
export declare function AlertConditionStep({ state, dispatch, services }: AlertConditionStepProps): React.JSX.Element;
export {};
