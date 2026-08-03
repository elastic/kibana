import React, { Component } from 'react';
import type { IVectorLayer } from '../../../../classes/layers/vector_layer';
interface Props {
    findLayerById: (layerId: string) => IVectorLayer | undefined;
    isLocked: boolean;
    layerId: string;
    onClose: () => void;
}
interface State {
    layerName: string | null;
}
export declare class Header extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadLayerState(): Promise<void>;
    render(): React.JSX.Element | null;
}
export {};
