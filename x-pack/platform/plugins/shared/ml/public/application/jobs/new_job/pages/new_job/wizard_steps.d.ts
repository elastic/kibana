import type { FC } from 'react';
import React from 'react';
import { WIZARD_STEPS } from '../components/step_types';
interface Props {
    currentStep: WIZARD_STEPS;
    setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
}
export declare const WizardSteps: FC<Props>;
export {};
