import type { LensAttributesV1, LensSavedObjectV1 } from '../../v1';
import type { LensAttributesV2, LensSavedObjectV2 } from './types';
/**
 * Transforms existing v1 Lens SO attributes to v2 Lens Item attributes
 *
 * Includes:
 * - Update version to v2
 * - convert splitAccessor to splitAccessors in cartesian charts
 */
export declare function transformToV2LensItemAttributes(attributes: LensAttributesV1 | LensAttributesV2): LensAttributesV2;
/**
 * Transforms existing v1 Lens SO to v2 Lens SO
 *
 * Includes:
 * - Update version to v2
 * - convert splitAccessor to splitAccessors in cartesian charts
 */
export declare function transformToV2LensSavedObject(so: LensSavedObjectV1 | LensSavedObjectV2): LensSavedObjectV2;
