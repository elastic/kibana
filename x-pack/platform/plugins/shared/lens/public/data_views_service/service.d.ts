import type { DataViewsContract, DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { IndexPattern, IndexPatternMap, DataViewsState } from '@kbn/lens-common';
export interface IndexPatternServiceProps {
    core: Pick<CoreStart, 'http' | 'notifications' | 'uiSettings'>;
    dataViews: DataViewsContract;
    uiActions: UiActionsStart;
    contextDataViewSpec?: DataViewSpec;
    updateIndexPatterns: (newState: Partial<DataViewsState>, options?: {
        applyImmediately: boolean;
    }) => void;
    replaceIndexPattern: (newIndexPattern: IndexPattern, oldId: string, options?: {
        applyImmediately: boolean;
    }) => void;
}
/**
 * This service is only available for the full editor version
 * and it encapsulate all the indexpattern methods and state
 * in a single object.
 * NOTE: this is not intended to be used with the Embeddable branch
 */
export interface IndexPatternServiceAPI {
    /**
     * Loads a list of indexPatterns from a list of id (patterns)
     * leveraging existing cache. Eventually fallbacks to unused indexPatterns ( notUsedPatterns )
     * @returns IndexPatternMap
     */
    loadIndexPatterns: (args: {
        patterns: string[];
        notUsedPatterns?: string[];
        cache: IndexPatternMap;
        onIndexPatternRefresh?: () => void;
    }) => Promise<IndexPatternMap>;
    /**
     * Ensure an indexPattern is loaded in the cache, usually used in conjuction with a indexPattern change action.
     */
    ensureIndexPattern: (args: {
        id: string;
        cache: IndexPatternMap;
    }) => Promise<IndexPatternMap | undefined>;
    replaceDataViewId: (newDataView: DataView) => Promise<void>;
    /**
     * Retrieves the default indexPattern from the uiSettings
     */
    getDefaultIndex: () => string;
    /**
     * Update the Lens dataViews state
     */
    updateDataViewsState: (newState: Partial<DataViewsState>, options?: {
        applyImmediately: boolean;
    }) => void;
}
export declare const createIndexPatternService: ({ core, dataViews, updateIndexPatterns, replaceIndexPattern, uiActions, contextDataViewSpec, }: IndexPatternServiceProps) => IndexPatternServiceAPI;
