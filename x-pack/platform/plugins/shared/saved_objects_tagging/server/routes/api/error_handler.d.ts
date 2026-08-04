import type { KibanaResponseFactory } from '@kbn/core/server';
export declare function handleRouteError(error: Error, res: KibanaResponseFactory, { notFoundMessage }?: {
    notFoundMessage?: string;
}): import("@kbn/core/server").IKibanaResponse<any>;
