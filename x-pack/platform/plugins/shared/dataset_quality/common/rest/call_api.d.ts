import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { FetchOptions } from '..';
export type CallApi = typeof callApi;
export declare function callApi<T = void>({ http }: CoreStart | CoreSetup, fetchOptions: FetchOptions): Promise<T>;
