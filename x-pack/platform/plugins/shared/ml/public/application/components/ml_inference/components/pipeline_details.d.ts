import type { FC } from 'react';
import type { MlInferenceState } from '../types';
interface Props {
    handlePipelineConfigUpdate: (configUpdate: Partial<MlInferenceState>) => void;
    modelId: string;
    pipelineNameError: string | undefined;
    pipelineName: string;
    pipelineDescription: string;
    targetField: string;
    targetFieldError: string | undefined;
}
export declare const PipelineDetails: FC<Props>;
export {};
