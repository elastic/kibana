import _ from 'lodash';
import React, { Component } from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { DRAW_SHAPE } from '../../../../common/constants';
interface Props {
    mbMap: MbMap;
    drawShape: DRAW_SHAPE;
}
interface State {
    x?: number;
    y?: number;
    isOpen: boolean;
}
export declare class DrawTooltip extends Component<Props, State> {
    private readonly _popoverRef;
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _hideTooltip: () => void;
    _updateTooltipLocation: _.DebouncedFuncLeading<({ lngLat }: any) => void>;
    render(): React.JSX.Element | null;
}
export {};
