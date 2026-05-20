import type { FC } from 'react';
import React from 'react';
import type { SupportedPytorchTasksType } from '@kbn/ml-trained-models-utils';
import { type InferecePipelineCreationState } from './state';
interface Props {
    handlePipelineConfigUpdate: (configUpdate: Partial<InferecePipelineCreationState>) => void;
    modelId: string;
    pipelineNameError: string | undefined;
    pipelineName: string;
    pipelineDescription: string;
    initialPipelineConfig?: InferecePipelineCreationState['initialPipelineConfig'];
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    taskType?: SupportedPytorchTasksType;
}
export declare const PipelineDetails: FC<Props>;
export {};
