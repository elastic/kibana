import React from 'react';
import type { ComposeDiscoverAction, ComposeDiscoverState, StepDefinition } from './types';
export interface ComposeDiscoverFooterProps {
    uiState: ComposeDiscoverState;
    dispatch: React.Dispatch<ComposeDiscoverAction>;
    currentStep: StepDefinition | undefined;
    isLastStep: boolean;
    isCreate: boolean;
    hasValidationErrors: boolean;
    yamlHasErrors: boolean;
    isBuilderMode: boolean;
    isBuilderStepValid: boolean;
    isSaving: boolean;
    onNext: () => void;
    onFinalSubmit: () => void;
    onYamlSave: () => void;
}
export declare const ComposeDiscoverFooter: ({ uiState, dispatch, currentStep, isLastStep, isCreate, hasValidationErrors, yamlHasErrors, isBuilderMode, isBuilderStepValid, isSaving, onNext, onFinalSubmit, onYamlSave, }: ComposeDiscoverFooterProps) => React.ReactElement;
