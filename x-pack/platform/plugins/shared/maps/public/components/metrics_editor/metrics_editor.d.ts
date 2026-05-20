import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { AggDescriptor } from '../../../common/descriptor_types';
import { AGG_TYPE } from '../../../common/constants';
export declare function isMetricValid(aggDescriptor: AggDescriptor): boolean;
interface Props {
    allowMultipleMetrics: boolean;
    bucketsName?: string;
    isJoin: boolean;
    metrics: AggDescriptor[];
    fields: DataViewField[];
    onChange: (metrics: AggDescriptor[]) => void;
    metricsFilter?: (metricOption: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
}
interface State {
    metrics: AggDescriptor[];
}
export declare class MetricsEditor extends Component<Props, State> {
    constructor(props: Props);
    _onSubmit(): void;
    _renderMetrics(): React.JSX.Element[];
    _addMetric: () => void;
    _renderAddMetricButton(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
