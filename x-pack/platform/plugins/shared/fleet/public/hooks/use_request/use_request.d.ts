import type { HttpSetup } from '@kbn/core/public';
import type { SendRequestConfig, SendRequestResponse, UseRequestConfig } from '@kbn/es-ui-shared-plugin/public';
export type { UseRequestConfig } from '@kbn/es-ui-shared-plugin/public';
/**
 * @internal
 */
export interface RequestError extends Error {
    statusCode?: number;
}
export declare const setHttpClient: (client: HttpSetup) => void;
export declare const sendRequest: <D = any, E = RequestError>(config: SendRequestConfig) => Promise<SendRequestResponse<D, E>>;
export declare const sendRequestForRq: <D = any, E = RequestError>(config: SendRequestConfig) => Promise<D>;
export declare const useRequest: <D = any, E = RequestError>(config: UseRequestConfig) => import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<D, E>;
export type SendConditionalRequestConfig = (SendRequestConfig & {
    shouldSendRequest: true;
}) | (Partial<SendRequestConfig> & {
    shouldSendRequest: false;
});
export declare const useConditionalRequest: <D = any, E = RequestError>(config: SendConditionalRequestConfig) => {
    sendRequest: () => Promise<SendRequestResponse<D, E> | undefined>;
    error: RequestError | null;
    data: D | null;
    isLoading: boolean;
};
