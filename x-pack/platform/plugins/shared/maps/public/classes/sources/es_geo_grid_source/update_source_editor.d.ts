import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { GRID_RESOLUTION } from '../../../../common/constants';
import { AGG_TYPE, LAYER_TYPE, RENDER_AS } from '../../../../common/constants';
import type { AggDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
interface Props {
    bucketsName: string;
    currentLayerType?: string;
    geoFieldName: string;
    indexPatternId: string;
    onChange: (...args: OnSourceChangeArgs[]) => Promise<void>;
    metrics: AggDescriptor[];
    renderAs: RENDER_AS;
    resolution: GRID_RESOLUTION;
}
interface State {
    metricsEditorKey: string;
    fields: DataViewField[];
    loadError?: string;
}
export declare class UpdateSourceEditor extends Component<Props, State> {
    private _isMounted?;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadFields(): Promise<void>;
    _getNewLayerType(renderAs: RENDER_AS, resolution: GRID_RESOLUTION): LAYER_TYPE | undefined;
    _onMetricsChange: (metrics: AggDescriptor[]) => void;
    _onResolutionChange: (resolution: GRID_RESOLUTION, metrics: AggDescriptor[]) => Promise<void>;
    _onRequestTypeSelect: (requestType: RENDER_AS) => void;
    _getMetricsFilter(): (metric: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
    _renderMetricsPanel(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
