import React, { Component } from 'react';
import type { ILayer } from '../../../../../../classes/layers/layer';
export interface Props {
    cloneLayer: (layerId: string) => void;
    enableShapeEditing: (layerId: string) => void;
    enablePointEditing: (layerId: string) => void;
    displayName: string;
    openLayerSettings: () => void;
    escapedDisplayName: string;
    fitToBounds: (layerId: string) => void;
    isEditButtonDisabled: boolean;
    isReadOnly: boolean;
    layer: ILayer;
    removeLayer: (layerId: string) => void;
    showThisLayerOnly: (layerId: string) => void;
    supportsFitToBounds: boolean;
    toggleVisible: (layerId: string) => void;
    numLayers: number;
    ungroupLayer: (layerId: string) => void;
}
interface State {
    isPopoverOpen: boolean;
    showRemoveModal: boolean;
    supportsFeatureEditing: boolean;
    isFeatureEditingEnabled: boolean;
}
export declare class TOCEntryActionsPopover extends Component<Props, State> {
    state: State;
    private _isMounted;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    _loadFeatureEditing(): Promise<void>;
    _getIsFeatureEditingEnabled(): Promise<boolean>;
    _togglePopover: () => void;
    _closePopover: () => void;
    _getActionsPanel(): {
        id: number;
        title: string;
        items: ({
            name: string;
            icon: React.JSX.Element;
            'data-test-subj': string;
            toolTipContent: string | null;
            disabled: boolean;
            onClick: () => void;
        } | {
            name: string;
            icon: React.JSX.Element;
            'data-test-subj': string;
            toolTipContent: null;
            onClick: () => void;
            disabled?: undefined;
        })[];
    };
    render(): React.JSX.Element;
}
export {};
