import type { FC } from 'react';
import React from 'react';
import type { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYTICS_STEPS } from '../../page';
import type { ValidationSummary } from './validation_step_wrapper';
export declare const ValidationStepDetails: FC<{
    setCurrentStep: React.Dispatch<React.SetStateAction<ANALYTICS_STEPS>>;
    state: State;
    validationSummary: ValidationSummary;
}>;
