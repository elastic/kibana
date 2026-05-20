import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IngestStreamLifecycle, IngestStreamLifecycleDSL, IngestStreamLifecycleDisabled, IngestStreamLifecycleILM } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { IndicesDataStreamFailureStore, IndicesDataStreamOptionsTemplate, IndicesSimulateTemplateTemplate } from '@elastic/elasticsearch/lib/api/types';
import type { StreamsMappingProperties } from '@kbn/streams-schema/src/fields';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
interface DataStreamManagementOptions {
    esClient: ElasticsearchClient;
    name: string;
    logger: Logger;
}
interface DeleteDataStreamOptions {
    esClient: ElasticsearchClient;
    name: string;
    logger: Logger;
}
interface UpdateOrRolloverDataStreamOptions {
    esClient: ElasticsearchClient;
    name: string;
    logger: Logger;
}
interface UpdateDataStreamsMappingsOptions {
    esClient: ElasticsearchClient;
    logger: Logger;
    name: string;
    mappings: StreamsMappingProperties;
}
interface UpdateDefaultIngestPipelineOptions {
    esClient: ElasticsearchClient;
    name: string;
    pipeline: string | undefined;
}
export declare function upsertDataStream({ esClient, name, logger }: DataStreamManagementOptions): Promise<void>;
export declare function deleteDataStream({ esClient, name, logger }: DeleteDataStreamOptions): Promise<void>;
export declare function rolloverDataStream({ esClient, name, logger, }: UpdateOrRolloverDataStreamOptions): Promise<void>;
export declare function updateDefaultIngestPipeline({ esClient, name, pipeline, }: UpdateDefaultIngestPipelineOptions): Promise<void>;
export interface DataStreamMappingsUpdateResponse {
    data_streams: Array<{
        name: string;
        applied_to_data_stream: boolean;
        error?: string;
        mappings: Record<string, unknown>;
        effective_mappings: Record<string, unknown>;
    }>;
}
export declare function updateDataStreamsMappings({ esClient, logger, name, mappings, }: UpdateDataStreamsMappingsOptions): Promise<void>;
export declare function updateDataStreamsLifecycle({ esClient, logger, names, lifecycle, isServerless, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    names: string[];
    lifecycle: IngestStreamLifecycle;
    isServerless: boolean;
}): Promise<void>;
export declare function putDataStreamsSettings({ esClient, names, settings, }: {
    esClient: ElasticsearchClient;
    names: string[];
    settings: {
        'index.lifecycle.name'?: string | null;
        'index.lifecycle.prefer_ilm'?: boolean | null;
        'index.number_of_replicas'?: number | null;
        'index.number_of_shards'?: number | null;
        'index.refresh_interval'?: string | -1 | null;
    };
}): Promise<void>;
/**
 * Maps a non-inherit stream failure_store definition to Elasticsearch failure_store options
 * (put data stream API and index template data_stream_options).
 */
export declare function failureStoreDefinitionToElasticsearchOptions(failureStore: FailureStore, isServerless: boolean): IndicesDataStreamFailureStore;
/**
 * Template-layer failure store options for wired stream index templates so new or restored
 * data streams materialize with the correct failure store when deferral skips putDataStreamOptions.
 */
export declare function failureStoreToIndexTemplateDataStreamOptions(failureStore: FailureStore, isServerless: boolean): IndicesDataStreamOptionsTemplate | undefined;
export declare function updateDataStreamsFailureStore({ esClient, logger, failureStore, stream, isServerless, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    failureStore: FailureStore;
    stream: Streams.all.Definition;
    isServerless: boolean;
}): Promise<void>;
export declare function getTemplateLifecycle(template: IndicesSimulateTemplateTemplate & {
    lifecycle?: {
        enabled: boolean;
        data_retention?: string;
    };
}): IngestStreamLifecycleILM | IngestStreamLifecycleDSL | IngestStreamLifecycleDisabled;
export {};
