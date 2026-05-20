import type { FC } from 'react';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { type Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { DashboardItems } from '../../../services/dashboard_service';
import type { CustomUrlSettings } from './utils';
interface CustomUrlEditorProps {
    customUrl: CustomUrlSettings | undefined;
    setEditCustomUrl: (url: CustomUrlSettings) => void;
    savedCustomUrls: MlUrlConfig[];
    dashboards: DashboardItems;
    dataViewListItems: DataViewListItem[];
    showCustomTimeRangeSelector: boolean;
    job: Job | DataFrameAnalyticsConfig;
    isPartialDFAJob?: boolean;
}
export declare const CustomUrlEditor: FC<CustomUrlEditorProps>;
export {};
