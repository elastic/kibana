import type { IndicesIndexSettings, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { IngestPipelineWrapper, InitializeImportResponse, ImportDoc, ImportResponse } from '@kbn/file-upload-common';
interface CallInitializeImportRoute {
    index: string;
    settings: IndicesIndexSettings;
    mappings: MappingTypeMapping;
    ingestPipelines?: IngestPipelineWrapper[];
    existingIndex?: boolean;
    signal?: AbortSignal;
}
interface CallImportRoute {
    index: string;
    ingestPipelineId: string;
    data: ImportDoc[];
    signal?: AbortSignal;
}
export declare function callInitializeImportRoute({ index, settings, mappings, ingestPipelines, existingIndex, signal, }: CallInitializeImportRoute): Promise<InitializeImportResponse>;
export declare function callImportRoute({ index, data, ingestPipelineId, signal }: CallImportRoute): Promise<ImportResponse>;
export {};
