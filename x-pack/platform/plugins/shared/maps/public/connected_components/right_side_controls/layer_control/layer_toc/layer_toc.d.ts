import _ from 'lodash';
import type { ComponentProps } from 'react';
import React, { Component } from 'react';
import { EuiDragDropContext } from '@elastic/eui';
import type { ILayer } from '../../../../classes/layers/layer';
export interface Props {
    isReadOnly: boolean;
    layerList: ILayer[];
    openTOCDetails: string[];
    createLayerGroup: (draggedLayerId: string, combineWithLayerId: string) => void;
    setLayerParent: (layerId: string, parent: string | undefined) => void;
    moveLayerToBottom: (moveLayerId: string) => void;
    moveLayerToLeftOfTarget: (moveLayerId: string, targetLayerId: string) => void;
}
interface State {
    combineLayer: ILayer | null;
    isOwnAncestor: boolean;
    newRightSiblingLayer: ILayer | null;
    sourceLayer: ILayer | null;
}
export declare class LayerTOC extends Component<Props> {
    state: State;
    componentWillUnmount(): void;
    shouldComponentUpdate(): boolean;
    _updateDebounced: _.DebouncedFunc<(callback?: (() => void) | undefined) => void>;
    _reverseIndex(index: number): number;
    _getForebearers(layer: ILayer): string[];
    _onDragStart: ComponentProps<typeof EuiDragDropContext>['onDragStart'];
    _onDragUpdate: ComponentProps<typeof EuiDragDropContext>['onDragUpdate'];
    _onDragEnd: ComponentProps<typeof EuiDragDropContext>['onDragEnd'];
    _getDepth(layer: ILayer, depth: number): {
        depth: number;
        showInTOC: boolean;
    };
    _getDroppableClass(): "" | "mapLayerToc-droppable-dropNotAllowed" | "mapLayerToc-droppable-isCombining" | "mapLayerToc-droppable-isDragging";
    _renderLayers(): React.JSX.Element | React.JSX.Element[];
    render(): React.JSX.Element;
}
export {};
