import React, { Component } from 'react';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Feature, Geometry, Position } from 'geojson';
import type { Map as MbMap, MapMouseEvent } from '@kbn/mapbox-gl';
import { DRAW_MODE, DRAW_SHAPE } from '../../../../../common/constants';
import type { ILayer } from '../../../../classes/layers/layer';
export interface ReduxStateProps {
    drawShape?: DRAW_SHAPE;
    drawMode: DRAW_MODE;
    editLayer: ILayer | undefined;
}
export interface ReduxDispatchProps {
    addNewFeatureToIndex: (geometries: Array<Geometry | Position[]>) => void;
    deleteFeatureFromIndex: (featureId: string) => void;
}
export interface OwnProps {
    mbMap: MbMap;
}
type Props = ReduxStateProps & ReduxDispatchProps & OwnProps;
export declare class DrawFeatureControl extends Component<Props, {}> {
    _onDraw: (e: {
        features: Feature[];
    }, mbDrawControl: MapboxDraw) => Promise<void>;
    _onClick: (event: MapMouseEvent, drawControl?: MapboxDraw) => Promise<void>;
    render(): React.JSX.Element;
}
export {};
