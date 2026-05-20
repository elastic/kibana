import type { ClusterComponentTemplate, IndicesDataStream, IndicesGetDataStreamSettingsDataStreamSettings, IndicesGetIndexTemplateIndexTemplateItem, IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { EffectiveFailureStore, DataStreamWithFailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { ClassicIngestStreamEffectiveLifecycle, IngestStreamSettings } from '@kbn/streams-schema';
interface BaseParams {
    esClient: ElasticsearchClient;
}
export declare function getDataStreamLifecycle(dataStream: IndicesDataStream | null): ClassicIngestStreamEffectiveLifecycle;
export declare function getDataStreamSettings(dataStream?: IndicesGetDataStreamSettingsDataStreamSettings): IngestStreamSettings;
interface ReadUnmanagedAssetsParams extends BaseParams {
    dataStream: IndicesDataStream;
}
export interface UnmanagedElasticsearchAssets {
    ingestPipeline: string | undefined;
    componentTemplates: string[];
    indexTemplate: string;
    dataStream: string;
}
export declare function getUnmanagedElasticsearchAssets({ dataStream, esClient, }: ReadUnmanagedAssetsParams): Promise<UnmanagedElasticsearchAssets>;
interface ReadUnmanagedAssetsDetailsParams extends BaseParams {
    assets: UnmanagedElasticsearchAssets;
}
export type UnmanagedComponentTemplateDetails = (ClusterComponentTemplate | {
    name: string;
    component_template: undefined;
}) & {
    used_by: string[];
};
export interface UnmanagedElasticsearchAssetDetails {
    ingestPipeline?: IngestPipeline & {
        name: string;
    };
    componentTemplates: UnmanagedComponentTemplateDetails[];
    indexTemplate: IndicesGetIndexTemplateIndexTemplateItem;
    dataStream: IndicesDataStream;
}
export declare function getUnmanagedElasticsearchAssetDetails({ esClient, assets, }: ReadUnmanagedAssetsDetailsParams): Promise<UnmanagedElasticsearchAssetDetails>;
interface CheckAccessParams extends BaseParams {
    name: string;
}
export declare function checkAccess({ name, esClient, isSecurityEnabled, }: CheckAccessParams & {
    isSecurityEnabled: boolean;
}): Promise<{
    read: boolean;
    write: boolean;
}>;
interface CheckAccessBulkParams extends BaseParams {
    names: string[];
}
export declare function checkAccessBulk({ names, esClient, isSecurityEnabled, }: CheckAccessBulkParams & {
    isSecurityEnabled: boolean;
}): Promise<Record<string, {
    read: boolean;
    write: boolean;
}>>;
export declare function getDataStream({ name, esClient, }: {
    name: string;
    esClient: ElasticsearchClient;
}): Promise<IndicesDataStream>;
export declare function getFailureStore({ dataStream, }: {
    dataStream: DataStreamWithFailureStore | null;
}): EffectiveFailureStore;
export {};
