import type { FC } from 'react';
import type { TrainedModelItem } from '@kbn/ml-common-types/trained_models';
export type IngestStatsResponse = Exclude<TrainedModelItem['stats'], undefined>['ingest'];
interface ModelPipelinesProps {
    pipelines: TrainedModelItem['pipelines'];
    ingestStats: IngestStatsResponse;
}
export declare const ModelPipelines: FC<ModelPipelinesProps>;
export {};
