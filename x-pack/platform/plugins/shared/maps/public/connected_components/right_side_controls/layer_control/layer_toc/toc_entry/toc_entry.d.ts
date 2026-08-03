import React, { Component } from 'react';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { ILayer } from '../../../../../classes/layers/layer';
export interface ReduxStateProps {
    inspectorAdapters: Adapters;
    isReadOnly: boolean;
    zoom: number;
    selectedLayer: ILayer | undefined;
    hasDirtyStateSelector: boolean;
    isLegendDetailsOpen: boolean;
    isEditButtonDisabled: boolean;
    isFeatureEditorOpenForLayer: boolean;
}
export interface ReduxDispatchProps {
    fitToBounds: (layerId: string) => void;
    openLayerPanel: (layerId: string) => Promise<void>;
    hideTOCDetails: (layerId: string) => void;
    showTOCDetails: (layerId: string) => void;
    toggleVisible: (layerId: string) => void;
    cancelEditing: () => void;
}
export interface OwnProps {
    depth: number;
    layer: ILayer;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
    isDragging?: boolean;
    isDraggingOver?: boolean;
    isCombineLayer?: boolean;
}
type Props = ReduxStateProps & ReduxDispatchProps & OwnProps;
interface State {
    displayName: string;
    hasLegendDetails: boolean;
    shouldShowModal: boolean;
    supportsFitToBounds: boolean;
}
export declare class TOCEntry extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    _toggleLayerDetailsVisibility: () => void;
    _loadSupportsFitToBounds(): Promise<void>;
    _loadHasLegendDetails(): Promise<void>;
    _updateDisplayName(): Promise<void>;
    _openLayerPanelWithCheck: () => void;
    _fitToBounds: () => void;
    _toggleVisible: () => void;
    _renderCancelModal(): React.JSX.Element | null;
    _renderQuickActions(): React.JSX.Element;
    _renderDetailsToggle(): React.JSX.Element | null;
    _renderLayerHeader(): React.JSX.Element;
    _hightlightAsSelectedLayer(): boolean | undefined;
    render(): React.JSX.Element;
}
export {};
