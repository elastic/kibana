import type { LensAttributesV0 } from './v0';
import type { LensAttributesV1 } from './v1';
import type { LensAttributesV2 } from './v2';
export declare function isLensAttributesV0(attributes: LensAttributesV0 | LensAttributesV1 | LensAttributesV2): attributes is LensAttributesV0;
export declare function isLensAttributesV1(attributes: LensAttributesV0 | LensAttributesV1 | LensAttributesV2): attributes is LensAttributesV1;
export declare function isLensAttributesV2(attributes: LensAttributesV0 | LensAttributesV1 | LensAttributesV2): attributes is LensAttributesV2;
