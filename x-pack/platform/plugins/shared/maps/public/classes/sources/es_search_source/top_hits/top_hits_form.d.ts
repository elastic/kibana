import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { SortDirection } from '@kbn/data-plugin/public';
import type { OnSourceChangeArgs } from '../../source';
interface Props {
    indexPatternId: string;
    isColumnCompressed?: boolean;
    isTimeseries: boolean;
    onChange: (args: OnSourceChangeArgs) => void;
    sortField: string;
    sortFields: DataViewField[];
    sortOrder: SortDirection;
    termFields: DataViewField[];
    topHitsGroupByTimeseries: boolean;
    topHitsSplitField: string | null;
    topHitsSize: number;
}
interface State {
    maxInnerResultWindow: number;
}
export declare class TopHitsForm extends Component<Props, State> {
    state: {
        maxInnerResultWindow: number;
    };
    _isMounted: boolean;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _onGroupByTimeseriesChange: (topHitsGroupByTimeseries: boolean) => void;
    _onTopHitsSplitFieldChange: (topHitsSplitField?: string) => void;
    _onTopHitsSizeChange: (size: number) => void;
    _onSortFieldChange: (sortField?: string) => void;
    _onSortOrderChange: (event: ChangeEvent<HTMLSelectElement>) => void;
    loadIndexSettings(): Promise<void>;
    render(): React.JSX.Element;
}
export {};
