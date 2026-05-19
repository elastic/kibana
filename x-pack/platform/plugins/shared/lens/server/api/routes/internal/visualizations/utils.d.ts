import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensSavedObject, LensUpdateIn } from '../../../../content_management';
import type { LensCreateRequestBody, LensResponseItem, LensUpdateRequestBody } from './types';
/**
 * Converts Lens request data to Lens Config
 */
export declare function getLensInternalRequestConfig(builder: LensConfigBuilder, request: LensCreateRequestBody | LensUpdateRequestBody): LensUpdateIn['data'] & LensUpdateIn['options'];
/**
 * Used to extend the meta of the response item. Needed in Lens GET request.
 */
export type ExtendedLensResponseItem<M extends Record<string, string | boolean> = {}> = Omit<LensResponseItem, 'meta'> & {
    meta: LensResponseItem['meta'] & M;
};
/**
 * Converts Lens Saved Object to Lens Response Item
 */
export declare function getLensInternalResponseItem<M extends Record<string, string | boolean>>(builder: LensConfigBuilder, item: LensSavedObject, extraMeta?: M): ExtendedLensResponseItem<M>;
