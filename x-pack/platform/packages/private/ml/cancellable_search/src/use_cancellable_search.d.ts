import type { IKibanaSearchRequest, IKibanaSearchResponse, ISearchOptions } from '@kbn/search-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
export interface UseCancellableSearch {
    runRequest: <RequestBody extends IKibanaSearchRequest, ResponseType extends IKibanaSearchResponse>(requestBody: RequestBody, options?: ISearchOptions) => Promise<ResponseType | null>;
    cancelRequest: () => void;
    isLoading: boolean;
}
export declare function useCancellableSearch(data: DataPublicPluginStart): {
    runRequest: <RequestBody extends IKibanaSearchRequest, ResponseType extends IKibanaSearchResponse>(requestBody: RequestBody, options?: {}) => Promise<ResponseType | null>;
    cancelRequest: () => void;
    isLoading: boolean;
};
