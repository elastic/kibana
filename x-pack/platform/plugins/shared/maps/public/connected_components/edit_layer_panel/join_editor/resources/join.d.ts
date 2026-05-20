import React, { Component } from 'react';
import type { DataViewField, DataView, Query } from '@kbn/data-plugin/common';
import type { JoinField } from '../join_editor';
import type { AggDescriptor, JoinDescriptor, JoinSourceDescriptor } from '../../../../../common/descriptor_types';
interface Props {
    join: Partial<JoinDescriptor>;
    onChange: (joinDescriptor: Partial<JoinDescriptor>) => void;
    onRemove: () => void;
    leftFields: JoinField[];
    leftSourceName: string;
}
interface State {
    rightFields: DataViewField[];
    indexPattern?: DataView;
    loadError?: string;
}
export declare class Join extends Component<Props, State> {
    private _isMounted;
    private _nextIndexPatternId;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadRightFields(indexPatternId?: string): Promise<void>;
    _onLeftFieldChange: (leftField: string) => void;
    _onRightSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;
    _onMetricsChange: (metrics: AggDescriptor[]) => void;
    _onWhereQueryChange: (whereQuery?: Query) => void;
    _onApplyGlobalQueryChange: (applyGlobalQuery: boolean) => void;
    _onApplyGlobalTimeChange: (applyGlobalTime: boolean) => void;
    render(): React.JSX.Element;
}
export {};
