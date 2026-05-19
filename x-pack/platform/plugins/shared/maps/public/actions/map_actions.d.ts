import type { AnyAction, Dispatch } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Filter, ProjectRouting } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import type { Geometry, Position } from 'geojson';
import { DRAW_SHAPE } from '../../common/constants';
import type { MapExtentState } from '../reducers/map/types';
import type { MapStoreState } from '../reducers/store';
import type { CustomIcon, DrawState, MapCenterAndZoom, MapExtent, MapSettings, Timeslice } from '../../common/descriptor_types';
import { INITIAL_LOCATION } from '../../common/constants';
export declare function setPauseSyncData(pauseSyncData: boolean): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function setMapInitError(errorMessage: string): {
    type: string;
    errorMessage: string;
};
export declare function setMapSettings(settings: Partial<MapSettings>): {
    type: string;
    settings: Partial<Required<Readonly<{
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
        initialLocation?: INITIAL_LOCATION | undefined;
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
    } & {}>>>;
};
export declare function rollbackMapSettings(): {
    type: string;
};
export declare function trackMapSettings(): {
    type: string;
};
export declare function updateMapSetting(settingKey: string, settingValue: string | boolean | number | object): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => void;
export declare function updateCustomIcons(customIcons: CustomIcon[]): {
    type: string;
    settingKey: string;
    settingValue: Readonly<{} & {
        label: string;
        svg: string;
        radius: number;
        symbolId: string;
        cutoff: number;
    }>[];
};
export declare function deleteCustomIcon(value: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function mapReady(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function mapDestroyed(): {
    type: string;
};
export declare function mapExtentChanged(mapExtentState: MapExtentState): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => void;
export declare function setMouseCoordinates({ lat, lon }: {
    lat: number;
    lon: number;
}): {
    type: string;
    lat: number;
    lon: number;
};
export declare function clearMouseCoordinates(): {
    type: string;
};
export declare function setGotoWithCenter({ lat, lon, zoom }: MapCenterAndZoom): {
    type: string;
    center: {
        lat: number;
        lon: number;
        zoom: number;
    };
};
export declare function clearGoto(): {
    type: string;
};
export declare function setQuery({ query, timeFilters, timeslice, filters, forceRefresh, searchSessionId, searchSessionMapBuffer, clearTimeslice, projectRouting, }: {
    filters?: Filter[];
    query?: Query;
    timeFilters?: TimeRange;
    timeslice?: Timeslice;
    forceRefresh?: boolean;
    searchSessionId?: string;
    searchSessionMapBuffer?: MapExtent;
    clearTimeslice?: boolean;
    projectRouting?: ProjectRouting;
}): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function setEmbeddableSearchContext({ query, filters, }: {
    filters: Filter[];
    query?: Query;
}): {
    type: string;
    embeddableSearchContext: {
        filters: Filter[];
        query: Query | undefined;
    };
};
export declare function setExecutionContext(executionContext: KibanaExecutionContext): {
    type: string;
    executionContext: KibanaExecutionContext;
};
export declare function updateDrawState(drawState: DrawState | null): (dispatch: Dispatch) => void;
export declare function updateEditShape(shapeToDraw: DRAW_SHAPE | null): (dispatch: Dispatch, getState: () => MapStoreState) => void;
export declare function setEditLayerToSelectedLayer(): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function updateEditLayer(layerId: string | null): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => void;
export declare function addNewFeatureToIndex(geometries: Array<Geometry | Position[]>): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
export declare function deleteFeatureFromIndex(featureId: string): (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>, getState: () => MapStoreState) => Promise<void>;
