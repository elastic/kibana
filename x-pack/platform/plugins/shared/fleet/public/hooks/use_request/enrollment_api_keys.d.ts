import type { GetOneEnrollmentAPIKeyResponse, GetEnrollmentAPIKeysResponse, GetEnrollmentAPIKeysRequest, PostEnrollmentAPIKeyRequest, PostEnrollmentAPIKeyResponse, BulkDeleteEnrollmentAPIKeysRequest, BulkDeleteEnrollmentAPIKeysResponse } from '../../types';
import type { UseRequestConfig } from './use_request';
type RequestOptions = Pick<Partial<UseRequestConfig>, 'pollIntervalMs'>;
export declare function useGetOneEnrollmentAPIKey(keyId: string | undefined): {
    sendRequest: () => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetOneEnrollmentAPIKeyResponse, import("./use_request").RequestError> | undefined>;
    error: import("./use_request").RequestError | null;
    data: GetOneEnrollmentAPIKeyResponse | null;
    isLoading: boolean;
};
export declare function sendGetOneEnrollmentAPIKey(keyId: string, options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetOneEnrollmentAPIKeyResponse, import("./use_request").RequestError>>;
export declare function getOneEnrollmentAPIKeyToken(keyId: string): Promise<string>;
export declare function sendDeleteOneEnrollmentAPIKey(keyId: string, query?: {
    forceDelete?: boolean;
}, options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendGetEnrollmentAPIKeys(query: GetEnrollmentAPIKeysRequest['query'], options?: RequestOptions): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetEnrollmentAPIKeysResponse, import("./use_request").RequestError>>;
export declare function useGetEnrollmentAPIKeysQuery(query: GetEnrollmentAPIKeysRequest['query'], options?: RequestOptions): import("@kbn/react-query").UseQueryResult<GetEnrollmentAPIKeysResponse, unknown>;
export declare function sendCreateEnrollmentAPIKey(body: PostEnrollmentAPIKeyRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostEnrollmentAPIKeyResponse, import("./use_request").RequestError>>;
export declare function sendBulkDeleteEnrollmentAPIKeys(body: BulkDeleteEnrollmentAPIKeysRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<BulkDeleteEnrollmentAPIKeysResponse, import("./use_request").RequestError>>;
export {};
