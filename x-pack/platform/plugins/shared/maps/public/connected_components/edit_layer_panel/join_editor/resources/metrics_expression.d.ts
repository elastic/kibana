import React, { Component } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { AggDescriptor } from '../../../../../common/descriptor_types';
interface Props {
    metrics: AggDescriptor[];
    rightFields: DataViewField[];
    onChange: (metrics: AggDescriptor[]) => void;
}
interface State {
    isPopoverOpen: boolean;
}
export declare class MetricsExpression extends Component<Props, State> {
    state: State;
    _togglePopover: () => void;
    _closePopover: () => void;
    _renderMetricsEditor: () => React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
