import _ from 'lodash';
import React, { Component } from 'react';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { Map as MapboxMap } from '@kbn/mapbox-gl';
import type { ILayer } from '../../classes/layers/layer';
import type { CustomIcon, Goto, MapCenterAndZoom, MapSettings, Timeslice } from '../../../common/descriptor_types';
import type { RawValue } from '../../../common/constants';
import type { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import type { MapExtentState } from '../../reducers/map/types';
export interface Props {
    isMapReady: boolean;
    settings: MapSettings;
    customIcons: CustomIcon[];
    layerList: ILayer[];
    spatialFiltersLayer: ILayer;
    goto?: Goto | null;
    inspectorAdapters: Adapters;
    isFullScreen: boolean;
    extentChanged: (mapExtentState: MapExtentState) => void;
    onMapReady: (mapExtentState: MapExtentState) => void;
    onMapDestroyed: () => void;
    setMouseCoordinates: ({ lat, lon }: {
        lat: number;
        lon: number;
    }) => void;
    clearMouseCoordinates: () => void;
    clearGoto: () => void;
    setMapInitError: (errorMessage: string) => void;
    addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
    renderTooltipContent?: RenderToolTipContent;
    timeslice?: Timeslice;
    featureModeActive: boolean;
    filterModeActive: boolean;
    onMapMove?: (lat: number, lon: number, zoom: number) => void;
}
interface State {
    mbMap: MapboxMap | undefined;
}
export declare class MbMap extends Component<Props, State> {
    private _isMounted;
    private _containerRef;
    private _prevCustomIcons?;
    private _prevDisableInteractive?;
    private _prevProjection?;
    private _prevLayerList?;
    private _prevTimeslice?;
    private _navigationControl;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _debouncedSync: _.DebouncedFunc<() => void>;
    _getMapExtentState(): MapExtentState;
    _createMbMapInstance(initialView: MapCenterAndZoom | null): Promise<MapboxMap>;
    _initializeMap(): Promise<void>;
    _registerMapEventListeners(mbMap: MapboxMap): void;
    _reportUsage(): void;
    _loadMakiSprites(mbMap: MapboxMap): Promise<void>;
    _syncMbMapWithMapState: () => void;
    _syncMbMapWithLayerList: () => void;
    _syncMbMapWithInspector: () => void;
    _syncSettings(): void;
    _setContainerRef: (element: HTMLDivElement) => void;
    render(): React.JSX.Element;
}
export {};
