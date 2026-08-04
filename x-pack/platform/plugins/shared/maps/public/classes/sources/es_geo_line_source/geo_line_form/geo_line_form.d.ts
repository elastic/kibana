import React from 'react';
import type { DataView } from '@kbn/data-plugin/common';
interface Props {
    isColumnCompressed: boolean;
    indexPattern: DataView;
    groupByTimeseries: boolean;
    lineSimplificationSize: number;
    onGroupByTimeseriesChange: (groupByTimeseries: boolean) => void;
    onLineSimplificationSizeChange: (lineSimplificationSize: number) => void;
    onSortFieldChange: (fieldName: string) => void;
    onSplitFieldChange: (fieldName: string) => void;
    sortField: string;
    splitField: string;
}
export declare function GeoLineForm(props: Props): React.JSX.Element;
export {};
