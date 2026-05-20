import type { FC } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { TrainedModelItem } from '@kbn/ml-common-types/trained_models';
import { type InferecePipelineCreationState } from './state';
interface ContentProps {
    model: TrainedModelItem;
    handlePipelineConfigUpdate: (configUpdate: Partial<InferecePipelineCreationState>) => void;
    externalPipelineConfig?: estypes.IngestPipeline;
}
export declare const TestTrainedModel: FC<ContentProps>;
export {};
