import _ from 'lodash';
import React, { Component } from 'react';
import type { InspectorViewProps } from '@kbn/inspector-plugin/public';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { TileRequest } from '../types';
declare const REQUEST_VIEW_ID = "request_view";
export declare const RESPONSE_VIEW_ID = "response_view";
interface State {
    selectedLayer: EuiComboBoxOptionOption<string> | null;
    selectedTileRequest: TileRequest | null;
    selectedView: typeof REQUEST_VIEW_ID | typeof RESPONSE_VIEW_ID;
    tileRequests: TileRequest[];
    layerOptions: Array<EuiComboBoxOptionOption<string>>;
}
export declare class VectorTileInspector extends Component<InspectorViewProps, State> {
    private _isMounted;
    constructor(props: InspectorViewProps);
    componentDidMount(): void;
    componentWillUnmount(): void;
    _getDefaultLayer(layerOptions: Array<EuiComboBoxOptionOption<string>>): EuiComboBoxOptionOption<string>;
    _getDefaultTileRequest(tileRequests: TileRequest[]): TileRequest | null;
    _onAdapterChange: () => void;
    _debouncedOnAdapterChange: _.DebouncedFunc<() => void>;
    _onLayerSelect: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
    _onTileSelect: (selectedOptions: Array<EuiComboBoxOptionOption<TileRequest>>) => void;
    _renderTileRequest(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
