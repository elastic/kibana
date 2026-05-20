import React, { Component } from 'react';
import type { Map as MbMap, MapMouseEvent } from '@kbn/mapbox-gl';
interface Props {
    mbMap: MbMap;
}
interface State {
    show: boolean;
}
export declare class KeydownScrollZoom extends Component<Props, State> {
    private _isMounted;
    private _hideTimeout;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _onWheel: (event: MapMouseEvent) => void;
    render(): React.JSX.Element;
}
export {};
