import React, { Component } from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { Filter } from '@kbn/es-query';
import type { Feature } from 'geojson';
import type { DrawState } from '../../../../../common/descriptor_types';
export interface Props {
    addFilters: (filters: Filter[], actionId: string) => Promise<void>;
    disableDrawState: () => void;
    drawState?: DrawState;
    filterModeActive: boolean;
    mbMap: MbMap;
    geoFieldNames: string[];
}
export declare class DrawFilterControl extends Component<Props, {}> {
    _onDraw: (e: {
        features: Feature[];
    }) => Promise<void>;
    render(): React.JSX.Element;
}
