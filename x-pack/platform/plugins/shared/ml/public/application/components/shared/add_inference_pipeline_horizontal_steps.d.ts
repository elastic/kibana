import type { FC } from 'react';
import type { AddInferencePipelineSteps } from '../ml_inference/types';
interface Props {
    step: AddInferencePipelineSteps;
    setStep: (step: AddInferencePipelineSteps) => void;
    isDetailsStepValid: boolean;
    isConfigureProcessorStepValid?: boolean;
    hasProcessorStep: boolean;
    pipelineCreated: boolean;
}
export declare const AddInferencePipelineHorizontalSteps: FC<Props>;
export {};
