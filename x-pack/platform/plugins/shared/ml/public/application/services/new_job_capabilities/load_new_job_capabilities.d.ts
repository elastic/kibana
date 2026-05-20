import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { JobType } from '@kbn/ml-common-types/saved_objects';
import type { NotificationsStart } from '@kbn/core/public';
import type { MlApi } from '../ml_api_service';
export declare const ANOMALY_DETECTOR = "anomaly-detector";
export declare const DATA_FRAME_ANALYTICS = "data-frame-analytics";
export declare function loadNewJobCapabilities(dataViewId: string, savedSearchId: string, mlApi: MlApi, dataViewsService: DataViewsContract, savedSearchService: SavedSearchPublicPluginStart, jobType: JobType, notifications: NotificationsStart): Promise<unknown>;
