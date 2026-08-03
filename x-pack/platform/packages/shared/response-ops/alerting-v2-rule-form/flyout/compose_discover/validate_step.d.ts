import type { UseFormReturn } from 'react-hook-form';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { FormValues } from '../../form/types';
import type { BuilderState } from './rule_builder/types';
import type { ComposeDiscoverState, StepDefinition } from './types';
export declare const evaluateStepValidation: (step: StepDefinition, methods: UseFormReturn<FormValues>, state: ComposeDiscoverState, services?: RuleFormServices, builderState?: BuilderState) => boolean | Promise<boolean>;
export declare const validateStep: (step: StepDefinition, methods: UseFormReturn<FormValues>, state: ComposeDiscoverState, services?: RuleFormServices, builderState?: BuilderState) => Promise<boolean>;
