import type { CustomHttpResponseOptions, ResponseError } from '@kbn/core/server';
export declare function wrapError(error: any): CustomHttpResponseOptions<ResponseError>;
