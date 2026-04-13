import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ClusterPutComponentTemplateRequest, ClusterPutComponentTemplateResponse, FieldCapsRequest, FieldCapsResponse, Indices, IndicesGetIndexTemplateRequest, IndicesGetIndexTemplateResponse, IndicesGetMappingResponse, IndicesGetSettingsResponse, IndicesPutSettingsRequest, IndicesPutSettingsResponse, IndicesRolloverResponse } from '@elastic/elasticsearch/lib/api/types';
type DatasetQualityESSearchParams = ESSearchRequest & {
    size: number;
};
export type DatasetQualityESClient = ReturnType<typeof createDatasetQualityESClient>;
export declare function createDatasetQualityESClient(esClient: ElasticsearchClient): {
    search<TDocument, TParams extends DatasetQualityESSearchParams>(searchParams: TParams): Promise<InferSearchResponseOf<TDocument, TParams>>;
    msearch<TDocument, TParams extends DatasetQualityESSearchParams>(index: {
        index?: Indices;
    } | undefined, searches: TParams[]): Promise<{
        responses: Array<InferSearchResponseOf<TDocument, TParams>>;
    }>;
    fieldCaps(params: FieldCapsRequest): Promise<FieldCapsResponse>;
    mappings(params: {
        index: string;
    }): Promise<IndicesGetMappingResponse>;
    settings(params: {
        index: string;
    }): Promise<IndicesGetSettingsResponse>;
    updateComponentTemplate(params: ClusterPutComponentTemplateRequest): Promise<ClusterPutComponentTemplateResponse>;
    updateSettings(params: IndicesPutSettingsRequest): Promise<IndicesPutSettingsResponse>;
    rollover(params: {
        alias: string;
    }): Promise<IndicesRolloverResponse>;
    indexTemplates(params: IndicesGetIndexTemplateRequest): Promise<IndicesGetIndexTemplateResponse>;
};
export {};
