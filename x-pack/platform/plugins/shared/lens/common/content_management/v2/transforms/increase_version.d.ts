import type { LensAttributes } from '../../../../server/content_management/v2/types';
import type { LensAttributesV1 } from '../../v1';
import type { LensAttributesV2 } from './types';
export declare function increaseVersion(attributes: LensAttributesV1 | LensAttributesV2): LensAttributes;
