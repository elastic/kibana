import type { HttpFetchOptions } from '@kbn/core/public';
export type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
    pathname: string;
    method?: string;
    body?: any;
};
export interface ApiErrorResponse {
    body: {
        statusCode: number;
        error: string;
        message: string;
        attributes: object;
    };
}
