import type { estypes } from '@elastic/elasticsearch';
import type { IngestInferenceProcessor } from '@elastic/elasticsearch/lib/api/types';
import type { TrainedModelItem } from '@kbn/ml-common-types/trained_models';
export interface InferecePipelineCreationState {
    creatingPipeline: boolean;
    error: boolean;
    ignoreFailure: boolean;
    modelId: string;
    onFailure?: IngestInferenceProcessor['on_failure'];
    pipelineName: string;
    pipelineNameError?: string;
    pipelineDescription: string;
    pipelineCreated: boolean;
    pipelineError?: string;
    initialPipelineConfig?: estypes.IngestPipeline;
    takeActionOnFailure: boolean;
}
export declare const getInitialState: (model: TrainedModelItem, initialPipelineConfig: estypes.IngestPipeline | undefined) => InferecePipelineCreationState;
