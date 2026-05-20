import type { FC } from 'react';
import type { MlUrlConfig, MlKibanaUrlConfig } from '@kbn/ml-anomaly-utils';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
/**
 * Finds the data view ID for a custom URL.
 * For dashboards URLs: Returns the job's destination index data view ID.
 * Uses source index for partial DFA jobs since destination index doesn't exist yet.
 * For discover URLs: Extracts data view ID directly from the URL state.
 */
export declare function extractDataViewIdFromCustomUrl(dfaJob: DataFrameAnalyticsConfig, customUrl: MlKibanaUrlConfig, dataViewListItems?: DataViewListItem[], isPartialDFAJob?: boolean): string | undefined;
export interface CustomUrlListProps {
    job: Job | DataFrameAnalyticsConfig;
    customUrls: MlUrlConfig[];
    onChange: (customUrls: MlUrlConfig[]) => void;
    dataViewListItems?: DataViewListItem[];
    isPartialDFAJob?: boolean;
}
export declare const CustomUrlList: FC<CustomUrlListProps>;
