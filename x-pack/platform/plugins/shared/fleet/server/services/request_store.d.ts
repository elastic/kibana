import { AsyncLocalStorage } from 'async_hooks';
import type { KibanaRequest } from '@kbn/core-http-server';
export declare function getRequestStore(): AsyncLocalStorage<KibanaRequest<unknown, unknown, unknown, any>>;
