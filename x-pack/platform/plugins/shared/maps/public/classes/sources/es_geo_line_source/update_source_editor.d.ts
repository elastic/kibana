import React, { Component } from 'react';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
import type { AggDescriptor } from '../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../source';
interface Props {
    bucketsName: string;
    indexPatternId: string;
    groupByTimeseries: boolean;
    lineSimplificationSize: number;
    splitField: string;
    sortField: string;
    metrics: AggDescriptor[];
    onChange: (...args: OnSourceChangeArgs[]) => void;
}
interface State {
    indexPattern: DataView | null;
    fields: DataViewField[];
}
export declare class UpdateSourceEditor extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadFields(): Promise<void>;
    _onMetricsChange: (metrics: AggDescriptor[]) => void;
    _onGroupByTimeseriesChange: (value: boolean) => void;
    _onLineSimplificationSizeChange: (value: number) => void;
    _onSplitFieldChange: (value: string) => void;
    _onSortFieldChange: (value: string) => void;
    render(): React.JSX.Element | null;
}
export {};
