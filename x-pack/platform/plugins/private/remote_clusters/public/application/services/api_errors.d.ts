import type { IHttpFetchError } from '@kbn/core-http-browser';
interface CommonErrorBody {
    statusCode: number;
    message: string;
    error: string;
}
export declare function showApiWarning(error: IHttpFetchError<CommonErrorBody>, errorTitle: string): import("@kbn/core/public").Toast;
export declare function showApiError(error: IHttpFetchError<CommonErrorBody>, errorTitle: string): import("@kbn/core/public").Toast;
export {};
