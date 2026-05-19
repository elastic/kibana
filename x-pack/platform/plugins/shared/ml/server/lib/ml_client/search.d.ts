import type { IScopedClusterClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { TransportResult, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type { MLSavedObjectService } from '../../saved_objects';
import type { ServerlessInfo } from '../../types';
export declare function searchProvider(client: IScopedClusterClient, mlSavedObjectService: MLSavedObjectService, serverless: ServerlessInfo): {
    anomalySearch: {
        <T>(searchParams: estypes.SearchRequest, jobIds: string[], options?: TransportRequestOptionsWithOutMeta): Promise<estypes.SearchResponse<T>>;
        <T>(searchParams: estypes.SearchRequest, jobIds: string[], options?: TransportRequestOptionsWithMeta): Promise<TransportResult<estypes.SearchResponse<T>>>;
        <T>(searchParams: estypes.SearchRequest, jobIds: string[], options?: TransportRequestOptions): Promise<estypes.SearchResponse<T>>;
    };
};
