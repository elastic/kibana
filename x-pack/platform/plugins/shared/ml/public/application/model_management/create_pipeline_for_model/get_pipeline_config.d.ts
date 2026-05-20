import type { estypes } from '@elastic/elasticsearch';
import type { InferecePipelineCreationState } from './state';
export declare function getPipelineConfig(state: InferecePipelineCreationState): estypes.IngestPipeline;
