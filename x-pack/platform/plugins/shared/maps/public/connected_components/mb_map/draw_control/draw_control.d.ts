import _ from 'lodash';
import React, { Component } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { Feature } from 'geojson';
import type { MapMouseEvent } from '@kbn/mapbox-gl';
import { DRAW_SHAPE } from '../../../../common/constants';
export interface Props {
    drawShape?: DRAW_SHAPE;
    onDraw: (event: {
        features: Feature[];
    }, drawControl?: MapboxDraw) => void;
    onClick?: (event: MapMouseEvent, drawControl?: MapboxDraw) => void;
    mbMap: MbMap;
    enable: boolean;
}
export declare class DrawControl extends Component<Props> {
    private _isMounted;
    private _isMapRemoved;
    private _mbDrawControlAdded;
    private _mbDrawControl;
    componentDidUpdate(): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _setIsMapRemoved: () => void;
    _onDraw: (event: {
        features: Feature[];
    }) => void;
    _onClick: (event: MapMouseEvent) => void;
    _syncDrawControl: _.DebouncedFunc<() => void>;
    _removeDrawControl(): void;
    _updateDrawControl(): void;
    render(): React.JSX.Element | null;
}
