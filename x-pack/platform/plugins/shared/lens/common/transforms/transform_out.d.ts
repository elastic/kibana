import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { LensTransformOut } from './types';
/**
 * Transform from Lens Stored State to Lens API format
 */
export declare const getTransformOut: (builder: LensConfigBuilder, transformDrilldownsOut: DrilldownTransforms["transformOut"], isDashboardAppRequest: boolean) => LensTransformOut;
