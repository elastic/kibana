import type { HttpStart } from '@kbn/core/public';
import type { APIEndpoint, APIReturnType } from '../server';
export interface SourcesApiOptions {
    body?: unknown;
    signal?: AbortSignal;
}
export declare const callSourcesAPI: <T extends APIEndpoint>(http: HttpStart, pathname: T, options?: SourcesApiOptions) => Promise<APIReturnType<T>>;
