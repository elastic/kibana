import React, { Component } from 'react';
import type { DataViewField } from '@kbn/data-plugin/common';
import type { AggDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
interface Props {
    bucketsName: string;
    indexPatternId: string;
    metrics: AggDescriptor[];
    onChange: (...args: OnSourceChangeArgs[]) => void;
}
interface State {
    fields: DataViewField[];
}
export declare class UpdateSourceEditor extends Component<Props, State> {
    private _isMounted;
    state: {
        fields: never[];
    };
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadFields(): Promise<void>;
    _onMetricsChange: (metrics: AggDescriptor[]) => void;
    render(): React.JSX.Element;
}
export {};
