import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
/**
 * Default Connector routes error handler
 * @param res
 * @param error
 */
export declare const errorHandler: <E extends Error>(res: KibanaResponseFactory, error: E) => IKibanaResponse;
