import React from 'react';
import type { ComposeDiscoverState, ComposeDiscoverAction, RecoveryType, StepDefinition } from '../types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
interface ComposeDiscoverFormProps {
    state: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    services: RuleFormServices;
    onRecoveryTypeChange: (type: RecoveryType) => void;
}
export declare const getSteps: (tracking: boolean) => StepDefinition[];
export declare const ComposeDiscoverForm: React.FC<ComposeDiscoverFormProps>;
export {};
