import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
export declare const getLogsOtelPipelineProcessors: () => IngestProcessorContainer[];
export declare const getLogsEcsPipelineProcessors: () => IngestProcessorContainer[];
export declare const getLogsDefaultPipelineProcessors: () => IngestProcessorContainer[];
