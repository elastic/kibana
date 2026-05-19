import { type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensSavedObject, LensUpdateIn } from '../../../content_management';
import type { LensCreateRequestBody, LensResponseItem, LensUpdateRequestBody } from './types';
/**
 * Converts Lens request data to Lens Config
 */
export declare function getLensRequestConfig(builder: LensConfigBuilder, config: LensCreateRequestBody | LensUpdateRequestBody): LensUpdateIn['data'] & LensUpdateIn['options'];
/**
 * Converts Lens Saved Object to Lens Response Item
 */
export declare function getLensResponseItem(builder: LensConfigBuilder, item: LensSavedObject): LensResponseItem;
