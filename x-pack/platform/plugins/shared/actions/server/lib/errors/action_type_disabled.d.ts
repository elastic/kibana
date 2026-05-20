import type { KibanaResponseFactory } from '@kbn/core/server';
import type { ErrorThatHandlesItsOwnResponse } from './types';
export type ActionTypeDisabledReason = 'config' | 'license_unavailable' | 'license_invalid' | 'license_expired';
export declare class ActionTypeDisabledError extends Error implements ErrorThatHandlesItsOwnResponse {
    readonly reason: ActionTypeDisabledReason;
    constructor(message: string, reason: ActionTypeDisabledReason);
    sendResponse(res: KibanaResponseFactory): import("@kbn/core/server").IKibanaResponse<any>;
}
