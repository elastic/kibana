import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import type { UiActionsStart, VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { VisualizeEditorContext, FormBasedPersistedState, FormBasedPrivateState, FormBasedLayer, IndexPattern, IndexPatternRef, DateRange } from '@kbn/lens-common';
export declare function onRefreshIndexPattern(): void;
export declare function extractReferences({ layers }: FormBasedPrivateState): {
    references: Reference[];
    state: FormBasedPersistedState;
};
export declare function injectReferences(state: FormBasedPersistedState, references: Reference[]): {
    layers: Record<string, FormBasedLayer>;
};
export declare function loadInitialState({ persistedState, references, defaultIndexPatternId, storage, initialContext, indexPatternRefs, indexPatterns, dateRange, }: {
    persistedState?: FormBasedPersistedState;
    references?: Reference[];
    defaultIndexPatternId?: string;
    storage: IStorageWrapper;
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    indexPatternRefs?: IndexPatternRef[];
    indexPatterns?: Record<string, IndexPattern>;
    dateRange?: DateRange;
}): FormBasedPrivateState;
export declare function changeIndexPattern({ indexPatternId, state, storage, indexPatterns, }: {
    indexPatternId: string;
    state: FormBasedPrivateState;
    storage: IStorageWrapper;
    indexPatterns: Record<string, IndexPattern>;
}): {
    layers: Record<string, FormBasedLayer>;
    currentIndexPatternId: string;
};
export declare function renameIndexPattern({ oldIndexPatternId, newIndexPatternId, state, }: {
    oldIndexPatternId: string;
    newIndexPatternId: string;
    state: FormBasedPrivateState;
}): {
    layers: {
        [x: string]: FormBasedLayer;
    };
    currentIndexPatternId: string;
};
export declare function triggerActionOnIndexPatternChange({ state, layerId, uiActions, indexPatternId, }: {
    indexPatternId: string;
    layerId: string;
    state: FormBasedPrivateState;
    uiActions: UiActionsStart;
}): Promise<void>;
export declare function changeLayerIndexPattern({ indexPatternId, indexPatterns, layerIds, state, replaceIfPossible, storage, }: {
    indexPatternId: string;
    layerIds: string[];
    state: FormBasedPrivateState;
    replaceIfPossible?: boolean;
    storage: IStorageWrapper;
    indexPatterns: Record<string, IndexPattern>;
}): {
    layers: {
        [x: string]: FormBasedLayer;
    };
    currentIndexPatternId: string;
};
