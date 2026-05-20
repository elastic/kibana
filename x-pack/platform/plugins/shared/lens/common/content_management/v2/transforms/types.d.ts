import type { SOWithMetadata } from '@kbn/content-management-utils';
import type { LensAttributes } from '../../../../server/content_management/v2';
/**
 * An unversioned Lens item that may or may not include old runtime migrations.
 */
export type LensSavedObjectV2 = SOWithMetadata<LensAttributesV2>;
export type LensAttributesV2 = LensAttributes;
