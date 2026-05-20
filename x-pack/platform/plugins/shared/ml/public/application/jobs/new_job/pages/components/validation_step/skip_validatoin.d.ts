import type { FC } from 'react';
import React from 'react';
import type { WIZARD_STEPS } from '../step_types';
export declare const SkipValidationButton: FC<{
    nextActive: boolean;
    setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
}>;
