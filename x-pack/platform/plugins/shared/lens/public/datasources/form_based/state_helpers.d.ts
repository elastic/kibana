import type { FormBasedPrivateState, FormBasedLayer } from '@kbn/lens-common';
export declare function mergeLayer({ state, layerId, newLayer, }: {
    state: FormBasedPrivateState;
    layerId: string;
    newLayer: Partial<FormBasedLayer>;
}): {
    layers: {
        [x: string]: FormBasedLayer | {
            columnOrder: string[];
            columns: Record<string, import("@kbn/lens-common").GenericIndexPatternColumn>;
            indexPatternId: string;
            linkToLayers?: string[];
            incompleteColumns?: Record<string, import("@kbn/lens-common").IncompleteColumn | undefined>;
            sampling?: number;
            ignoreGlobalFilters?: boolean;
        };
    };
    currentIndexPatternId: string;
};
export declare function mergeLayers({ state, newLayers, }: {
    state: FormBasedPrivateState;
    newLayers: Record<string, FormBasedLayer>;
}): {
    layers: {
        [x: string]: FormBasedLayer;
    };
    currentIndexPatternId: string;
};
