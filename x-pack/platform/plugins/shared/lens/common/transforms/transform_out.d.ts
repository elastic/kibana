import { type LensByValueSerializedState } from '@kbn/lens-common';
import type { LensAttributes, LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { LensTransformOut } from './types';
/**
 * Transform from Lens Stored State to Lens API format
 */
export declare const getTransformOut: (builder: LensConfigBuilder, transformDrilldownsOut: DrilldownTransforms["transformOut"], isDashboardAppRequest: boolean) => LensTransformOut;
/**
 * Handles transforming old lens SO in dashboard to v1 Lens SO
 */
export declare function migrateAttributes(attributes: LensByValueSerializedState['attributes']): LensAttributes;
