import type { DataViewsContract, DataView, DataViewSpec, DataViewField } from '@kbn/data-views-plugin/public';
import type { HttpStart } from '@kbn/core/public';
import type { IndexPattern, IndexPatternField, IndexPatternMap, IndexPatternRef, TextBasedPersistedState } from '@kbn/lens-common';
type ErrorHandler = (err: Error) => void;
type MinimalDataViewsContract = Pick<DataViewsContract, 'get' | 'getIdsWithTitle' | 'create'>;
/**
 * All these functions will be used by the Embeddable instance too,
 * therefore keep all these functions pretty raw here and do not use the IndexPatternService
 */
export declare function getFieldByNameFactory(newFields: IndexPatternField[]): (name: string) => IndexPatternField;
export declare function convertDataViewIntoLensIndexPattern(dataView: DataView, restrictionRemapper?: (name: string) => string): IndexPattern;
export declare function buildIndexPatternField(field: DataViewField, metaKeys?: Set<string>): IndexPatternField;
export declare function loadIndexPatternRefs(dataViews: MinimalDataViewsContract): Promise<IndexPatternRef[]>;
/**
 * Ensures ESQL ad-hoc DataView specs have a valid `timeFieldName` if any.
 *
 * Persisted specs may be missing time field info (e.g. when created via the Lens API).
 * For each text-based layer with an ES|QL query, this function checks whether the
 * corresponding ad-hoc DataView spec already has a `timeFieldName`. If not, the time
 * field is resolved via the TIMEFIELD_ROUTE and patched onto the existing spec in-place.
 *
 * Uses `getESQLTimeFieldFromQuery` directly instead of `getESQLAdHocDataview` to avoid
 * creating a DataView instance (which would pollute the DataViewsService cache with a
 * field-less entry due to `skipFetchFields`) and to avoid generating a new DataView ID
 * that would mismatch the `layer.index` key used by downstream consumers.
 */
export declare function ensureESQLTimeFieldOnAdHocDataViews({ adHocDataViews, textBasedState, dataViewsService, http, }: {
    adHocDataViews: Record<string, DataViewSpec>;
    textBasedState: TextBasedPersistedState | undefined;
    dataViewsService: DataViewsContract;
    http?: HttpStart;
}): Promise<Record<string, DataViewSpec>>;
export declare function loadIndexPatterns({ dataViews, patterns, notUsedPatterns, cache, adHocDataViews, onIndexPatternRefresh, }: {
    dataViews: MinimalDataViewsContract;
    patterns: string[];
    notUsedPatterns?: string[];
    cache: Record<string, IndexPattern>;
    adHocDataViews?: Record<string, DataViewSpec>;
    onIndexPatternRefresh?: () => void;
}): Promise<Record<string, IndexPattern>>;
export declare function ensureIndexPattern({ id, onError, dataViews, cache, }: {
    id: string;
    onError: ErrorHandler;
    dataViews: MinimalDataViewsContract;
    cache?: IndexPatternMap;
}): Promise<{
    [x: string]: IndexPattern;
} | undefined>;
export {};
