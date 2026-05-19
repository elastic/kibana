import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import type { LensSerializedState } from '@kbn/lens-common';
/**
 * Keys that should be persisted at the panel level.
 * All other properties from LensSerializedState are inherited from the
 * dashboard/container or are runtime-only and should not be persisted.
 *
 * TODO - LensSerializedState should really be paired down to match this list.
 * it is currently used as a runtime state object but it shouldn't be.
 */
type IncludedPanelStateKeys = 'ref_id' | 'attributes' | 'references' | 'time_range' | keyof SerializedTitles | keyof SerializedDrilldowns;
export type StrippedLensState = Pick<LensSerializedState, IncludedPanelStateKeys>;
/**
 * The serialized state contains many properties that are inherited from the dashboard or other container
 * or are runtime-only (like executionContext) and should not be persisted at the panel
 * level. This function strips those out to ensure only panel-level state is persisted.
 */
export declare function stripInheritedContext(state: LensSerializedState): StrippedLensState;
export {};
