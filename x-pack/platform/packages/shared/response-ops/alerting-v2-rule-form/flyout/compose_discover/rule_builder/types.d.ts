import type React from 'react';
import type { ComposeDiscoverAction, ComposeDiscoverState, CustomRecoveryRenderProps } from '../types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
export type BuilderState = unknown;
export interface RuleBuilderStepProps {
    state: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    services: RuleFormServices;
}
export interface RuleBuilderDefinition<TState = BuilderState> {
    type: string;
    stepTitle: string;
    createDefaultState: () => TState;
    renderStep: (props: RuleBuilderStepProps) => React.ReactNode;
    renderRecoveryStep?: (props: CustomRecoveryRenderProps) => React.ReactNode;
    validate?: (state: ComposeDiscoverState, builderState?: TState) => boolean;
    parseState?: (query: string, recoveryQuery?: string) => TState | null;
}
