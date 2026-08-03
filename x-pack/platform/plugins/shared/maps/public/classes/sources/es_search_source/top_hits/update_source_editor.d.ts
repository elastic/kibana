import React, { Component } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { SortDirection } from '@kbn/data-plugin/public';
import type { OnSourceChangeArgs } from '../../source';
import type { ESSearchSource } from '../es_search_source';
import type { IField } from '../../../fields/field';
interface Props {
    filterByMapBounds: boolean;
    indexPatternId: string;
    onChange: (args: OnSourceChangeArgs) => void;
    tooltipFields: IField[];
    topHitsGroupByTimeseries: boolean;
    topHitsSplitField: string;
    topHitsSize: number;
    sortField: string;
    sortOrder: SortDirection;
    source: ESSearchSource;
}
interface State {
    isLoading: boolean;
    isTimeseries: boolean;
    loadError?: string;
    sourceFields: IField[];
    termFields: DataViewField[];
    sortFields: DataViewField[];
}
export declare class TopHitsUpdateSourceEditor extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    loadFields(): Promise<void>;
    _onTooltipPropertiesChange: (propertyNames: string[]) => void;
    _onFilterByMapBoundsChange: (event: EuiSwitchEvent) => void;
    render(): React.JSX.Element;
}
export {};
