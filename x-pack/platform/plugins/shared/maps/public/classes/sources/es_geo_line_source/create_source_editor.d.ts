import React, { Component } from 'react';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import type { ESGeoLineSourceDescriptor } from '../../../../common/descriptor_types';
interface Props {
    onSourceConfigChange: (sourceConfig: Partial<ESGeoLineSourceDescriptor> | null) => void;
}
interface State {
    indexPattern: DataView | null;
    pointFields: DataViewField[];
    geoField: string;
    groupByTimeseries: boolean;
    splitField: string;
    sortField: string;
    lineSimplificationSize: number;
}
export declare class CreateSourceEditor extends Component<Props, State> {
    state: State;
    _onIndexPatternSelect: (indexPattern: DataView) => void;
    _onGeoFieldSelect: (geoField?: string) => void;
    _onGroupByTimeseriesChange: (groupByTimeseries: boolean) => void;
    _onLineSimplificationSizeChange: (lineSimplificationSize: number) => void;
    _onSplitFieldSelect: (newValue: string) => void;
    _onSortFieldSelect: (newValue: string) => void;
    previewLayer: () => void;
    _renderGeoSelect(): React.JSX.Element | null;
    _renderGeoLineForm(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
