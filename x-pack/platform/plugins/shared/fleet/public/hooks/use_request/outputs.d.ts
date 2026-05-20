import type { GetOutputHealthResponse, GetRemoteSyncedIntegrationsStatusResponse } from '../../../common/types';
import type { PutOutputRequest, GetOutputsResponse, PostOutputRequest, PostLogstashApiKeyResponse } from '../../types';
export declare function useGetOutputs(): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetOutputsResponse, import("./use_request").RequestError>;
export declare function useDefaultOutput(): {
    output: import("../../types").Output | undefined;
    refresh: () => void;
};
export declare function sendGetOneOutput(outputId: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendPutOutput(outputId: string, body: PutOutputRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendPostLogstashApiKeys(): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<PostLogstashApiKeyResponse, import("./use_request").RequestError>>;
export declare function sendPostOutput(body: PostOutputRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendDeleteOutput(outputId: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendGetOutputHealth(outputId: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetOutputHealthResponse, import("./use_request").RequestError>>;
export declare function sendGetRemoteSyncedIntegrationsStatus(outputId: string): Promise<GetRemoteSyncedIntegrationsStatusResponse>;
export declare function useGetRemoteSyncedIntegrationsStatusQuery(outputId: string, options?: Partial<{
    enabled: boolean;
}>): import("@kbn/react-query").UseQueryResult<GetRemoteSyncedIntegrationsStatusResponse, unknown>;
