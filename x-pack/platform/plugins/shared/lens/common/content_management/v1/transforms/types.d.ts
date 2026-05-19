import type { SOWithMetadata } from '@kbn/content-management-utils';
import type { LensAttributes } from '../../../../server/content_management/v1';
export type LensAttributesV1 = LensAttributes;
/**
 * An unversioned Lens item that may or may not include old runtime migrations.
 */
export type LensSavedObjectV1 = SOWithMetadata<LensAttributesV1>;
