import React from 'react';
interface Props {
    groupByTimeseries: boolean;
    onGroupByTimeseriesChange: (groupByTimeseries: boolean) => void;
}
export declare function GroupByButtonGroup({ groupByTimeseries, onGroupByTimeseriesChange }: Props): React.JSX.Element;
export {};
