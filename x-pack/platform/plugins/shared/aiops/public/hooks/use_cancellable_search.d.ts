import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
export declare function useCancellableSearch(): {
    runRequest: <RequestBody extends IKibanaSearchRequest, ResponseType extends IKibanaSearchResponse>(requestBody: RequestBody) => Promise<ResponseType | null>;
    cancelRequest: () => void;
    isLoading: boolean;
};
