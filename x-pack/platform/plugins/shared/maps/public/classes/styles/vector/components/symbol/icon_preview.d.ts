import React, { Component } from 'react';
import type { Map as MapboxMap } from '@kbn/mapbox-gl';
export interface Props {
    svg: string;
    cutoff: number;
    radius: number;
    isSvgInvalid: boolean;
}
interface State {
    map: MapboxMap | null;
    iconColor: string;
}
export declare class IconPreview extends Component<Props, State> {
    static iconId: string;
    private _isMounted;
    private _containerRef;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(prevProps: Props): void;
    componentWillUnmount(): void;
    _setIconColor: (iconColor: string) => void;
    _setContainerRef: (element: HTMLDivElement) => void;
    _syncImageToMap(): Promise<void>;
    _syncPaintPropertiesToMap(): void;
    _createMapInstance(): MapboxMap;
    _initializeMap(): void;
    render(): React.JSX.Element;
}
export {};
