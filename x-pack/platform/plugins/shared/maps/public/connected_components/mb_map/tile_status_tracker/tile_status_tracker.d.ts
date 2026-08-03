import _ from 'lodash';
import { Component } from 'react';
import type { AJAXError, Map as MbMap, MapSourceDataEvent } from '@kbn/mapbox-gl';
import type { TileError, TileMetaFeature } from '../../../../common/descriptor_types';
import type { ILayer } from '../../../classes/layers/layer';
export interface Props {
    mbMap: MbMap;
    layerList: ILayer[];
    onTileStateChange: (layerId: string, areTilesLoaded: boolean, tileMetaFeatures?: TileMetaFeature[], tileErrors?: TileError[]) => void;
}
export declare class TileStatusTracker extends Component<Props> {
    private _isMounted;
    private _tileCache;
    private _tileErrorCache;
    private _layerCache;
    private _prevCenterTileKey?;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _onSourceDataLoading: (e: MapSourceDataEvent) => void;
    _onError: (e: MapSourceDataEvent & {
        error: {
            message: string;
        } | AJAXError;
    }) => void;
    _onSourceData: (e: MapSourceDataEvent) => void;
    _onMoveEnd: () => void;
    _updateTileStatusForAllLayers: _.DebouncedFunc<() => void>;
    _getTileMetaFeatures: (layer: ILayer) => TileMetaFeature[] | undefined;
    _removeTileFromCache: (mbSourceId: string, mbKey: string) => void;
    render(): null;
}
