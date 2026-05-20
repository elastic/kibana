import { type Moment } from 'moment';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { TimeRange as EsQueryTimeRange } from '@kbn/es-query';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { DashboardItems } from '../../../services/dashboard_service';
import type { TimeRangeType } from './constants';
import type { MlApi } from '../../../services/ml_api_service';
export interface TimeRange {
    type: TimeRangeType;
    interval: string;
}
export interface CustomUrlSettings {
    label: string;
    type: string;
    timeRange: TimeRange;
    customTimeRange?: {
        start: Moment;
        end: Moment;
    };
    kibanaSettings?: {
        dashboardId?: string;
        queryFieldNames?: string[];
        discoverIndexPatternId?: string;
        filters?: Filter[];
    };
    otherUrlSettings?: {
        urlValue: string;
    };
}
export declare function getNewCustomUrlDefaults(job: Job | DataFrameAnalyticsConfig, dashboards: DashboardItems, dataViews: DataViewListItem[], isPartialDFAJob?: boolean): CustomUrlSettings;
export declare function getSupportedFieldNames(job: DataFrameAnalyticsConfig | Job, dataView: DataView): string[];
export declare function getQueryEntityFieldNames(job: Job): string[];
export declare function isValidCustomUrlSettingsTimeRange(timeRangeSettings: TimeRange): boolean;
export declare function isValidCustomUrlSettings(settings: CustomUrlSettings, savedCustomUrls: MlUrlConfig[]): boolean;
export declare function buildCustomUrlFromSettings(dashboardService: DashboardStart, share: SharePluginStart, settings: CustomUrlSettings): Promise<MlUrlConfig>;
export declare function getTestUrl(mlApi: MlApi, job: Job | DataFrameAnalyticsConfig, customUrl: MlUrlConfig, timeFieldName: string | null, currentTimeFilter?: EsQueryTimeRange, isPartialDFAJob?: boolean): Promise<string>;
