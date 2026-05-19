import React from 'react';
import type { ComposeDiscoverState, ComposeDiscoverAction, StepDefinition } from './types';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
interface ComposeDiscoverFormProps {
    state: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    services: RuleFormServices;
}
export declare const getSteps: (tracking: boolean) => StepDefinition[];
export declare const ComposeDiscoverForm: React.FC<ComposeDiscoverFormProps>;
export {};
