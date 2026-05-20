import type { GetDownloadSourceResponse, PostDownloadSourceRequest, PutDownloadSourceRequest } from '../../types';
export declare function useGetDownloadSources(): import("@kbn/es-ui-shared-plugin/public").UseRequestResponse<GetDownloadSourceResponse, import("./use_request").RequestError>;
export declare function useDefaultDownloadSource(): {
    downloadSource: import("../../types").DownloadSource | undefined;
    refresh: () => void;
};
export declare function sendPutDownloadSource(downloadSourceId: string, body: PutDownloadSourceRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendPostDownloadSource(body: PostDownloadSourceRequest['body']): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
export declare function sendDeleteDownloadSource(downloadSourceId: string): Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<any, import("./use_request").RequestError>>;
