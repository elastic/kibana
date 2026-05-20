import type { FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataFrameAnalyticsConfig, DataFrameTaskStateType } from '@kbn/ml-data-frame-analytics-utils';
import type { ResultsSearchQuery } from '../../../../common/analytics';
interface Props {
    dataView: DataView;
    jobConfig: DataFrameAnalyticsConfig;
    jobStatus?: DataFrameTaskStateType;
    needsDestDataView: boolean;
    searchQuery: ResultsSearchQuery;
}
export declare const ExplorationResultsTable: FC<Props>;
export {};
