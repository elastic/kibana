import React, { Component } from 'react';
import type { DataView, Query } from '@kbn/data-plugin/common';
import type { ILayer } from '../../../classes/layers/layer';
export interface Props {
    layer: ILayer;
    setLayerQuery: (id: string, query: Query) => void;
    updateSourceProp: (layerId: string, propName: string, value: unknown) => void;
    isFeatureEditorOpenForLayer: boolean;
}
interface State {
    isPopoverOpen: boolean;
    dataView?: DataView;
    isSourceTimeAware: boolean;
}
export declare class FilterEditor extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadDataView(): Promise<void>;
    _loadSourceTimeAware(): Promise<void>;
    _toggle: () => void;
    _close: () => void;
    _onQueryChange: ({ query }: {
        query?: Query;
    }) => void;
    _onApplyGlobalQueryChange: (applyGlobalQuery: boolean) => void;
    _onApplyGlobalTimeChange: (applyGlobalTime: boolean) => void;
    _onRespondToForceRefreshChange: (applyForceRefresh: boolean) => void;
    _renderQueryPopover(): React.JSX.Element;
    _renderQuery(): React.JSX.Element;
    _renderOpenButton(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
