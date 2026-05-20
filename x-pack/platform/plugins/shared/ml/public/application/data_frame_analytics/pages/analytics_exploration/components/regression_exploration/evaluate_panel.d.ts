import type { FC } from 'react';
import { type DataFrameAnalyticsConfig, type DataFrameTaskStateType } from '@kbn/ml-data-frame-analytics-utils';
import type { estypes } from '@elastic/elasticsearch';
interface Props {
    jobConfig: DataFrameAnalyticsConfig;
    jobStatus?: DataFrameTaskStateType;
    searchQuery: estypes.QueryDslQueryContainer;
}
export declare const EvaluatePanel: FC<Props>;
export {};
