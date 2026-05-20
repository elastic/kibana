import type { AddInferencePipelineSteps } from './types';
export declare function getSteps(step: AddInferencePipelineSteps, isConfigureStepValid: boolean, isPipelineDataValid: boolean, hasProcessorStep: boolean): {
    nextStep: AddInferencePipelineSteps | undefined;
    previousStep: AddInferencePipelineSteps | undefined;
    isContinueButtonEnabled: boolean;
};
