import type { FC } from 'react';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
export interface CustomUrlsWrapperProps {
    job: Job | DataFrameAnalyticsConfig;
    jobCustomUrls: MlUrlConfig[];
    setCustomUrls: (customUrls: MlUrlConfig[]) => void;
    editMode?: 'inline' | 'modal';
    isPartialDFAJob?: boolean;
}
export declare const CustomUrlsWrapper: FC<CustomUrlsWrapperProps>;
