import React, { Component } from 'react';
import type { DataView, DataViewField } from '@kbn/data-plugin/common';
import { SortDirection } from '@kbn/data-plugin/public';
import type { ESSearchSourceDescriptor } from '../../../../../common/descriptor_types';
import type { OnSourceChangeArgs } from '../../source';
interface Props {
    onSourceConfigChange: (sourceConfig: Partial<ESSearchSourceDescriptor> | null, isPointsOnly: boolean) => void;
}
interface State {
    indexPattern: DataView | null;
    isTimeseries: boolean;
    geoFields: DataViewField[];
    geoFieldName: string | null;
    sortField: string | null;
    sortFields: DataViewField[];
    sortOrder: SortDirection;
    termFields: DataViewField[];
    topHitsGroupByTimeseries: boolean;
    topHitsSplitField: string | null;
    topHitsSize: number;
}
export declare class CreateSourceEditor extends Component<Props, State> {
    state: State;
    _onIndexPatternSelect: (indexPattern: DataView) => void;
    _onGeoFieldSelect: (geoFieldName?: string) => void;
    _onTopHitsPropChange: ({ propName, value }: OnSourceChangeArgs) => void;
    _previewLayer: () => void;
    _renderGeoSelect(): React.JSX.Element | null;
    _renderTopHitsPanel(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
