import React, { Component } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { AggDescriptor } from '../../../../common/descriptor_types';
interface Props {
    fields: DataViewField[];
    isJoin: boolean;
    metric: AggDescriptor;
    onChange: (metric: AggDescriptor) => void;
}
interface State {
    isPopoverOpen: boolean;
}
export declare class MaskExpression extends Component<Props, State> {
    state: State;
    _togglePopover: () => void;
    _closePopover: () => void;
    _getMaskExpressionValue(): string;
    _getAggLabel(): string;
    render(): React.JSX.Element | null;
}
export {};
