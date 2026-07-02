import type { KibanaResponseFactory } from '@kbn/core/server';
import type { ErrorThatHandlesItsOwnResponse } from './types';
export type PreconfiguredActionDisabledFrom = 'update' | 'delete';
export declare class PreconfiguredActionDisabledModificationError extends Error implements ErrorThatHandlesItsOwnResponse {
    readonly disabledFrom: PreconfiguredActionDisabledFrom;
    constructor(message: string, disabledFrom: PreconfiguredActionDisabledFrom);
    sendResponse(res: KibanaResponseFactory): import("@kbn/core/server").IKibanaResponse<any>;
}
