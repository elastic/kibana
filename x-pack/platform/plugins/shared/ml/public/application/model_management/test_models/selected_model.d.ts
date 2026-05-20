import type { estypes } from '@elastic/elasticsearch';
import type { FC } from 'react';
import React from 'react';
import { type TestTrainedModelsContextType } from './test_trained_models_context';
import type { INPUT_TYPE } from './models/inference_base';
import { type InferecePipelineCreationState } from '../create_pipeline_for_model/state';
interface Props {
    model: estypes.MlTrainedModelConfig;
    inputType: INPUT_TYPE;
    deploymentId: string;
    handlePipelineConfigUpdate?: (configUpdate: Partial<InferecePipelineCreationState>) => void;
    externalPipelineConfig?: estypes.IngestPipeline;
    setCurrentContext?: React.Dispatch<TestTrainedModelsContextType>;
}
export declare const SelectedModel: FC<Props>;
export {};
