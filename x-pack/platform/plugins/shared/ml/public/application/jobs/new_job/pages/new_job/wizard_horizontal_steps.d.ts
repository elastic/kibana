import type { FC } from 'react';
import React from 'react';
import type { WIZARD_STEPS } from '../components/step_types';
import type { JOB_TYPE } from '../../../../../../common/constants/new_job';
interface Props {
    currentStep: WIZARD_STEPS;
    highestStep: WIZARD_STEPS;
    setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
    disableSteps: boolean;
    jobType: JOB_TYPE;
}
export declare const WizardHorizontalSteps: FC<Props>;
export {};
