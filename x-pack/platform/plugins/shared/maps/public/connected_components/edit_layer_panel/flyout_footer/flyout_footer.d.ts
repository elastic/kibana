import React, { Component } from 'react';
import type { ILayer } from '../../../classes/layers/layer';
export interface Props {
    selectedLayer?: ILayer;
    cancelLayerPanel: () => void;
    saveLayerEdits: () => void;
    removeLayer: () => void;
    hasStateChanged: boolean;
}
interface State {
    showRemoveModal: boolean;
}
export declare class FlyoutFooter extends Component<Props, State> {
    state: State;
    _showRemoveModal: () => void;
    render(): React.JSX.Element;
}
export {};
