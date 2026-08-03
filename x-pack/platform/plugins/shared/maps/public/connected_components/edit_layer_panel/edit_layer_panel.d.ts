import React, { Component } from 'react';
import type { JoinField } from './join_editor';
import type { StyleDescriptor } from '../../../common/descriptor_types';
import type { ILayer } from '../../classes/layers/layer';
import type { OnSourceChangeArgs } from '../../classes/sources/source';
export interface Props {
    selectedLayer?: ILayer;
    updateSourceProps: (layerId: string, sourcePropChanges: OnSourceChangeArgs[]) => Promise<void>;
    updateStyleDescriptor: (styleDescriptor: StyleDescriptor) => void;
}
interface State {
    displayName: string;
    leftJoinFields: JoinField[];
    supportsFitToBounds: boolean;
}
export declare class EditLayerPanel extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadSupportsFitToBounds: () => Promise<void>;
    _loadDisplayName: () => Promise<void>;
    _loadLeftJoinFields(): Promise<void>;
    _onSourceChange: (...args: OnSourceChangeArgs[]) => Promise<void>;
    _renderFilterSection(): React.JSX.Element | null;
    _renderJoinSection(): React.JSX.Element | null | undefined;
    _renderSourceDetails(): React.JSX.Element | null;
    _renderSourceEditor(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
    _renderStyleEditor(): React.JSX.Element | null;
    render(): React.JSX.Element | null;
}
export {};
