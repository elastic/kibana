import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
export declare const applyPostProcessing: (processors: IngestProcessorContainer[]) => IngestProcessorContainer[];
