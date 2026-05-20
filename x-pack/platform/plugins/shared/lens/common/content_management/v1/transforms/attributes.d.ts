import type { LensAttributes } from '../../../../server/content_management/v1';
import type { LensSOAttributesV0 } from '../../../../server/content_management/v0';
/**
 * Cleanup null and loose SO attribute types
 * - `description` should not allow `null`
 * - `visualizationType` should not allow `null` or `undefined`
 */
export declare function attributesCleanup(attributes: LensSOAttributesV0): LensAttributes;
