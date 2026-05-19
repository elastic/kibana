import type { LensAttributesV0, LensSavedObjectV0 } from '../../v0/types';
import type { LensAttributesV1, LensSavedObjectV1 } from './types';
/**
 * Transforms existing unversioned Lens SO attributes to v1 Lens Item attributes
 *
 * Includes:
 * - Legend value → Legend stats
 * - Stringified color mapping values → Raw color mappings values
 * - Fix color mapping loop mode
 * - Cleanup Lens SO attributes
 * - Cleanup metric properties
 * - Add version property
 */
export declare function transformToV1LensItemAttributes(attributes: LensAttributesV0 | LensAttributesV1): LensAttributesV1;
/**
 * Transforms existing unversioned Lens SO to v1 Lens SO
 *
 * Includes:
 * - Legend value → Legend stats
 * - Stringified color mapping values → Raw color mappings values
 * - Add version property
 */
export declare function transformToV1LensSavedObject(so: LensSavedObjectV0 | LensSavedObjectV1): LensSavedObjectV1;
