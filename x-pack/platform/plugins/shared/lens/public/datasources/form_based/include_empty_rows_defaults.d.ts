import { type DateHistogramIndexPatternColumn, type FormBasedPrivateState, type LensDocument } from '@kbn/lens-common';
/**
 * Default `includeEmptyRows` for a new bucket column, given the active
 * visualization type id. Falls back to the historical `true` when the id is
 * unknown (e.g. a column created outside the Lens editor).
 */
export declare function getDefaultIncludeEmptyRows(visualizationTypeId?: string): boolean;
/** `buildColumn` param overrides owned by this module for a new bucket column. */
type NewBucketColumnParams = Required<Pick<DateHistogramIndexPatternColumn['params'], 'includeEmptyRows'>>;
/**
 * Per-visualization `buildColumn` param overrides for a new column, or
 * `undefined` when the operation owns no opinionated default.
 */
export declare function getColumnParamsForNewBucket(operationType: string, activeVisualizationTypeId?: string): NewBucketColumnParams | undefined;
/**
 * Applies the target visualization's `includeEmptyRows` default to columns that
 * are new in the suggestion (their id is absent from the previous state),
 * leaving already-configured columns untouched.
 *
 * Returns the suggestion state unchanged when nothing needs to be rewritten.
 */
export declare function applyEmptyRowsDefaultsToSuggestionState(suggestionState: FormBasedPrivateState, previousState: FormBasedPrivateState | undefined, targetVisualizationTypeId: string | undefined): FormBasedPrivateState;
/**
 * Applies the target visualization type's `includeEmptyRows` default to bucket
 * columns when switching chart type (or XY series type).
 *
 * The opinionated default always wins, overriding any value carried over from
 * the previous type. The single exception is switching a layer back to its
 * saved type: a column whose layer's persisted visualization type id equals the
 * target type restores its saved value instead, so a round trip returns to the
 * configuration the user explicitly saved.
 *
 * `targetLayerId` scopes the reconciliation to a single layer, used by a
 * same-visualization subtype switch (e.g. XY series type) that only changes the
 * type of one layer. When omitted, every layer is reconciled, as a
 * cross-visualization switch collapses the whole chart to one type.
 *
 * Returns the state reference unchanged when nothing needs to be rewritten.
 */
export declare function applyEmptyRowsDefaultsOnTypeSwitch(suggestionState: FormBasedPrivateState, persistedDoc: LensDocument | undefined, targetVisualizationTypeId: string | undefined, getPersistedVisualizationTypeId?: (layerId: string) => string | undefined, targetLayerId?: string): FormBasedPrivateState;
export {};
