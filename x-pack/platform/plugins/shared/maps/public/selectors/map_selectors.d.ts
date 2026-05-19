import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Query } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import { GeoJsonVectorLayer } from '../classes/layers/vector_layer';
import type { MapStoreState } from '../reducers/store';
import type { DataRequestDescriptor, CustomIcon, DrawState, EditState, Goto, LayerDescriptor, MapCenter, MapExtent, MapSettings, TooltipState } from '../../common/descriptor_types';
import type { ILayer } from '../classes/layers/layer';
export declare function createLayerInstance(layerDescriptor: LayerDescriptor, customIcons: CustomIcon[], chartsPaletteServiceGetColor?: (value: string) => string | null): ILayer;
export declare const getMapSettings: ({ map }: MapStoreState) => MapSettings;
export declare const hasMapSettingsChanges: ((state: MapStoreState) => boolean) & import("reselect").OutputSelectorFields<(args_0: Required<Readonly<{
    backgroundColor?: string | undefined;
    projection?: "globeInterpolate" | "mercator" | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    autoFitToDataBounds?: boolean | undefined;
    customIcons?: Readonly<{} & {
        label: string;
        svg: string;
        radius: number;
        symbolId: string;
        cutoff: number;
    }>[] | undefined;
    disableInteractive?: boolean | undefined;
    disableTooltipControl?: boolean | undefined;
    hideToolbarOverlay?: boolean | undefined;
    hideLayerControl?: boolean | undefined;
    hideViewControl?: boolean | undefined;
    initialLocation?: import("../../common/constants").INITIAL_LOCATION | undefined;
    fixedLocation?: Readonly<{} & {
        lat: number;
        lon: number;
        zoom: number;
    }> | undefined;
    browserLocation?: Readonly<{} & {
        zoom: number;
    }> | undefined;
    keydownScrollZoom?: boolean | undefined;
    showScaleControl?: boolean | undefined;
    showSpatialFilters?: boolean | undefined;
    showTimesliderToggleButton?: boolean | undefined;
    spatialFiltersAlpa?: number | undefined;
    spatialFiltersFillColor?: string | undefined;
    spatialFiltersLineColor?: string | undefined;
} & {}>>, args_1: Required<Readonly<{
    backgroundColor?: string | undefined;
    projection?: "globeInterpolate" | "mercator" | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    autoFitToDataBounds?: boolean | undefined;
    customIcons?: Readonly<{} & {
        label: string;
        svg: string;
        radius: number;
        symbolId: string;
        cutoff: number;
    }>[] | undefined;
    disableInteractive?: boolean | undefined;
    disableTooltipControl?: boolean | undefined;
    hideToolbarOverlay?: boolean | undefined;
    hideLayerControl?: boolean | undefined;
    hideViewControl?: boolean | undefined;
    initialLocation?: import("../../common/constants").INITIAL_LOCATION | undefined;
    fixedLocation?: Readonly<{} & {
        lat: number;
        lon: number;
        zoom: number;
    }> | undefined;
    browserLocation?: Readonly<{} & {
        zoom: number;
    }> | undefined;
    keydownScrollZoom?: boolean | undefined;
    showScaleControl?: boolean | undefined;
    showSpatialFilters?: boolean | undefined;
    showTimesliderToggleButton?: boolean | undefined;
    spatialFiltersAlpa?: number | undefined;
    spatialFiltersFillColor?: string | undefined;
    spatialFiltersLineColor?: string | undefined;
} & {}>> | null) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getOpenTooltips: ({ map }: MapStoreState) => TooltipState[];
export declare const getHasLockedTooltips: (state: MapStoreState) => boolean;
export declare const getMapReady: ({ map }: MapStoreState) => boolean;
export declare const getMapInitError: ({ map }: MapStoreState) => string | null | undefined;
export declare const getGoto: ({ map }: MapStoreState) => Goto | null | undefined;
export declare const getSelectedLayerId: ({ map }: MapStoreState) => string | null;
export declare const getLayerListRaw: ({ map }: MapStoreState) => LayerDescriptor[];
export declare const getWaitingForMapReadyLayerListRaw: ({ map }: MapStoreState) => LayerDescriptor[];
export declare const getMapExtent: ({ map }: MapStoreState) => MapExtent | undefined;
export declare const getMapBuffer: ({ map }: MapStoreState) => MapExtent | undefined;
export declare const getMapZoom: ({ map }: MapStoreState) => number;
export declare const getMapCenter: ({ map }: MapStoreState) => MapCenter;
export declare const getMouseCoordinates: ({ map }: MapStoreState) => {
    lat: number;
    lon: number;
} | undefined;
export declare const getTimeFilters: ({ map }: MapStoreState) => TimeRange;
export declare const getTimeslice: ({ map }: MapStoreState) => import("../../common/descriptor_types").Timeslice | undefined;
export declare const getCustomIcons: ({ map }: MapStoreState) => CustomIcon[];
export declare const getQuery: ({ map }: MapStoreState) => Query | undefined;
export declare const getFilters: ({ map }: MapStoreState) => Filter[];
export declare const getEmbeddableSearchContext: ({ map }: MapStoreState) => {
    query?: Query;
    filters: Filter[];
} | undefined;
export declare const getSearchSessionId: ({ map }: MapStoreState) => string | undefined;
export declare const getSearchSessionMapBuffer: ({ map }: MapStoreState) => MapExtent | undefined;
export declare const getProjectRouting: ({ map }: MapStoreState) => import("@kbn/es-query").ProjectRouting;
export declare const isUsingSearch: (state: MapStoreState) => boolean;
export declare const getDrawState: ({ map }: MapStoreState) => DrawState | undefined;
export declare const getEditState: ({ map }: MapStoreState) => EditState | undefined;
export declare function getLayerDescriptor(state: MapStoreState, layerId: string): LayerDescriptor | undefined;
export declare function getDataRequestDescriptor(state: MapStoreState, layerId: string, dataId: string): DataRequestDescriptor | undefined;
export declare function getExecutionContext(state: MapStoreState): KibanaExecutionContext;
export declare const getDataFilters: ((state: MapStoreState) => {
    extent: MapExtent | undefined;
    buffer: MapExtent | undefined;
    zoom: number;
    timeFilters: TimeRange;
    timeslice: import("../../common/descriptor_types").Timeslice | undefined;
    query: Query | undefined;
    filters: Filter[];
    embeddableSearchContext: {
        query?: Query;
        filters: Filter[];
    } | undefined;
    searchSessionId: string | undefined;
    projectRouting: import("@kbn/es-query").ProjectRouting;
    isReadOnly: boolean;
    executionContext: KibanaExecutionContext;
}) & import("reselect").OutputSelectorFields<(args_0: MapExtent | undefined, args_1: MapExtent | undefined, args_2: number, args_3: TimeRange, args_4: import("../../common/descriptor_types").Timeslice | undefined, args_5: Query | undefined, args_6: Filter[], args_7: {
    query?: Query;
    filters: Filter[];
} | undefined, args_8: string | undefined, args_9: MapExtent | undefined, args_10: import("@kbn/es-query").ProjectRouting, args_11: boolean, args_12: KibanaExecutionContext) => {
    extent: MapExtent | undefined;
    buffer: MapExtent | undefined;
    zoom: number;
    timeFilters: TimeRange;
    timeslice: import("../../common/descriptor_types").Timeslice | undefined;
    query: Query | undefined;
    filters: Filter[];
    embeddableSearchContext: {
        query?: Query;
        filters: Filter[];
    } | undefined;
    searchSessionId: string | undefined;
    projectRouting: import("@kbn/es-query").ProjectRouting;
    isReadOnly: boolean;
    executionContext: KibanaExecutionContext;
}, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getSpatialFiltersLayer: ((state: MapStoreState) => GeoJsonVectorLayer) & import("reselect").OutputSelectorFields<(args_0: Filter[], args_1: {
    query?: Query;
    filters: Filter[];
} | undefined, args_2: Required<Readonly<{
    backgroundColor?: string | undefined;
    projection?: "globeInterpolate" | "mercator" | undefined;
    minZoom?: number | undefined;
    maxZoom?: number | undefined;
    autoFitToDataBounds?: boolean | undefined;
    customIcons?: Readonly<{} & {
        label: string;
        svg: string;
        radius: number;
        symbolId: string;
        cutoff: number;
    }>[] | undefined;
    disableInteractive?: boolean | undefined;
    disableTooltipControl?: boolean | undefined;
    hideToolbarOverlay?: boolean | undefined;
    hideLayerControl?: boolean | undefined;
    hideViewControl?: boolean | undefined;
    initialLocation?: import("../../common/constants").INITIAL_LOCATION | undefined;
    fixedLocation?: Readonly<{} & {
        lat: number;
        lon: number;
        zoom: number;
    }> | undefined;
    browserLocation?: Readonly<{} & {
        zoom: number;
    }> | undefined;
    keydownScrollZoom?: boolean | undefined;
    showScaleControl?: boolean | undefined;
    showSpatialFilters?: boolean | undefined;
    showTimesliderToggleButton?: boolean | undefined;
    spatialFiltersAlpa?: number | undefined;
    spatialFiltersFillColor?: string | undefined;
    spatialFiltersLineColor?: string | undefined;
} & {}>>) => GeoJsonVectorLayer, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getLayerList: ((state: MapStoreState) => ILayer[]) & import("reselect").OutputSelectorFields<(args_0: LayerDescriptor[], args_1: (value: string) => string | null, args_2: Readonly<{} & {
    label: string;
    svg: string;
    radius: number;
    symbolId: string;
    cutoff: number;
}>[]) => ILayer[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getLayerListConfigOnly: ((state: MapStoreState) => any) & import("reselect").OutputSelectorFields<(args_0: LayerDescriptor[]) => any, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare function getLayerById(layerId: string | null, state: MapStoreState): ILayer | undefined;
export declare const getSelectedLayer: ((state: MapStoreState) => ILayer | undefined) & import("reselect").OutputSelectorFields<(args_0: string | null, args_1: ILayer[]) => ILayer | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const hasPreviewLayers: ((state: MapStoreState) => boolean) & import("reselect").OutputSelectorFields<(args_0: ILayer[]) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getMapColors: ((state: MapStoreState) => string[]) & import("reselect").OutputSelectorFields<(args_0: LayerDescriptor[]) => string[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getSelectedLayerJoinDescriptors: ((state: MapStoreState) => Partial<import("../../common/descriptor_types").JoinDescriptor>[]) & import("reselect").OutputSelectorFields<(args_0: ILayer | undefined) => Partial<import("../../common/descriptor_types").JoinDescriptor>[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getQueryableUniqueIndexPatternIds: ((state: MapStoreState) => string[]) & import("reselect").OutputSelectorFields<(args_0: ILayer[], args_1: LayerDescriptor[]) => string[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getMostCommonDataViewId: ((state: MapStoreState) => string | undefined) & import("reselect").OutputSelectorFields<(args_0: ILayer[], args_1: LayerDescriptor[]) => string | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const getGeoFieldNames: ((state: MapStoreState) => string[]) & import("reselect").OutputSelectorFields<(args_0: ILayer[], args_1: LayerDescriptor[]) => string[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const hasDirtyState: ((state: MapStoreState) => boolean) & import("reselect").OutputSelectorFields<(args_0: LayerDescriptor[]) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const isMapLoading: ((state: MapStoreState) => boolean) & import("reselect").OutputSelectorFields<(args_0: ILayer[], args_1: LayerDescriptor[], args_2: number) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
