import type { FC } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { TrainedModelItem } from '@kbn/ml-common-types/trained_models';
import { type InferecePipelineCreationState } from '../create_pipeline_for_model/state';
interface ContentProps {
    model: TrainedModelItem;
    handlePipelineConfigUpdate?: (configUpdate: Partial<InferecePipelineCreationState>) => void;
    externalPipelineConfig?: estypes.IngestPipeline;
}
export declare const TestTrainedModelContent: FC<ContentProps>;
export {};
