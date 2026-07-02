import type { KibanaResponseFactory, IKibanaResponse } from '@kbn/core/server';
export interface ErrorThatHandlesItsOwnResponse extends Error {
    sendResponse(res: KibanaResponseFactory): IKibanaResponse;
}
