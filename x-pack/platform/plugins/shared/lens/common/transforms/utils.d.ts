import type { Reference } from '@kbn/content-management-utils';
import type { LensByRefSerializedState, LensByValueSerializedState, LensSerializedState } from '@kbn/lens-common';
import type { LensByRefSerializedAPIConfig, LensByValueFlattenedSerializedAPIConfig, LensByValueSerializedAPIConfig, LensSerializedAPIConfig, LensWireAPIConfig } from '@kbn/lens-common-2';
import type { FlattenedLensByValuePanelSchema } from '../../server/types';
export declare const LENS_SAVED_OBJECT_REF_NAME = "savedObjectRef";
export declare function findLensReference(references?: Reference[]): Reference | undefined;
export declare function isByRefLensState(state: LensSerializedState): state is LensByRefSerializedState;
export declare function isByRefLensConfig(config: LensByRefSerializedAPIConfig | LensSerializedAPIConfig | LensByValueFlattenedSerializedAPIConfig | FlattenedLensByValuePanelSchema): config is LensByRefSerializedAPIConfig;
export declare function isFlattenedAPIConfig(config: FlattenedLensByValuePanelSchema | LensWireAPIConfig | LensSerializedAPIConfig | LensByValueSerializedState): config is FlattenedLensByValuePanelSchema | LensByValueFlattenedSerializedAPIConfig;
export declare function unflattenAPIConfig(config: FlattenedLensByValuePanelSchema | LensByValueFlattenedSerializedAPIConfig): LensByValueSerializedAPIConfig;
/**
 * Counterpart of {@link unflattenAPIConfig}: moves chart fields from nested `attributes`
 * to the root, producing the flat dashboard app wire shape used with `lens.apiFormat`.
 *
 * Chart-level `title`/`description` are stripped because the panel-level ones
 * (already at the root) are the source of truth. This makes the operation lossy:
 * `unflatten(flatten(x))` may differ from `x` when the chart carried its own title/description.
 *
 * Returns the input unchanged for by-ref configs or when `attributes` is not in API format.
 */
export declare function flattenAPIConfig(config: LensSerializedAPIConfig): LensWireAPIConfig;
