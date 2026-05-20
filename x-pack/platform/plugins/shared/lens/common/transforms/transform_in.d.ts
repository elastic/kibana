import { type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { LensTransformIn } from './types';
/**
 * Transform from Lens API format to Lens Serialized State
 */
export declare const getTransformIn: (builder: LensConfigBuilder, transformDrilldownsIn: DrilldownTransforms["transformIn"], isDashboardAppRequest: boolean) => LensTransformIn;
