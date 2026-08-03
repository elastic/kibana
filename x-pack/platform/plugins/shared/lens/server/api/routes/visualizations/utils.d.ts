import { type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensSavedObject, LensUpdateIn } from '../../../content_management';
import type { LensCreateRequestBody, LensResponseItem, LensUpdateRequestBody } from './types';
/**
 * Converts Lens request data to Lens Config
 */
export declare function getLensRequestConfig(builder: LensConfigBuilder, config: LensCreateRequestBody | LensUpdateRequestBody): LensUpdateIn['data'] & LensUpdateIn['options'];
/**
 * Converts Lens Saved Object to Lens Response Item.
 *
 * The `LensConfigBuilder` always emits GA duration unit names. When `useGASchemas` is `false`
 * (the `asCode.useGASchemas` feature flag is disabled), duration units are down-converted to their
 * legacy names so the response is consistent with the legacy input the route accepts.
 */
export declare function getLensResponseItem(builder: LensConfigBuilder, item: LensSavedObject, useGASchemas: boolean): LensResponseItem;
