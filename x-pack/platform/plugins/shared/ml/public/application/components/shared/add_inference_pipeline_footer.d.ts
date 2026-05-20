import type { FC } from 'react';
import type { AddInferencePipelineSteps } from '../ml_inference/types';
interface Props {
    isDetailsStepValid: boolean;
    isConfigureProcessorStepValid: boolean;
    pipelineCreated: boolean;
    creatingPipeline: boolean;
    step: AddInferencePipelineSteps;
    onClose: () => void;
    onCreate: () => void;
    setStep: (step: AddInferencePipelineSteps) => void;
    hasProcessorStep: boolean;
}
export declare const AddInferencePipelineFooter: FC<Props>;
export {};
