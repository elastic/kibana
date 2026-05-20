import type { FC } from 'react';
import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
interface Props {
    highlightTargetField?: boolean;
    inferencePipeline: IngestPipeline;
    modelType?: string;
    pipelineName: string;
    pipelineCreated: boolean;
    pipelineError?: string;
    sourceIndex?: string;
}
export declare const ReviewAndCreatePipeline: FC<Props>;
export {};
