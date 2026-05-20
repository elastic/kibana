import type { IndicesIndexSettings, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { type MessageReader, type TikaReader, type NdjsonReader, type ImportDoc, type IngestPipeline, type ImportResults } from '@kbn/file-upload-common';
import type { IImporter } from './types';
export declare const MAX_CHUNK_CHAR_COUNT = 1000000;
export declare const IMPORT_RETRIES = 5;
export declare abstract class Importer implements IImporter {
    protected _docArray: ImportDoc[];
    protected _chunkSize: number;
    private _index;
    private _pipelines;
    private _timeFieldName;
    private _initialized;
    protected abstract _reader: MessageReader | TikaReader | NdjsonReader;
    initialized(): boolean;
    getIndex(): string | undefined;
    getTimeField(): string | undefined;
    read(data: ArrayBuffer): {
        success: boolean;
    };
    private _initialize;
    initializeImport(index: string, settings: IndicesIndexSettings, mappings: MappingTypeMapping, pipelines: Array<IngestPipeline | undefined>, existingIndex?: boolean, signal?: AbortSignal): Promise<import("@kbn/file-upload-common").InitializeImportResponse>;
    initializeWithoutCreate(index: string, mappings: MappingTypeMapping, pipelines: IngestPipeline[]): Promise<void>;
    import(index: string, ingestPipelineId: string, setImportProgress: (progress: number) => void, signal?: AbortSignal): Promise<ImportResults>;
    private _getFirstReadDocs;
    private _getLastReadDocs;
    previewIndexTimeRange(): Promise<{
        start: number | null;
        end: number | null;
    }>;
    deletePipelines(signal?: AbortSignal): Promise<import("@elastic/elasticsearch/lib/api/types").AcknowledgedResponseBase[]>;
}
