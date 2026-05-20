import type { IScopedClusterClient } from '@kbn/core/server';
import type { NotificationsCountResponse, NotificationsSearchResponse } from '@kbn/ml-common-types/notifications';
import type { MlFeatures } from '../../../common/constants/app';
import type { MLSavedObjectService } from '../../saved_objects';
import type { MessagesSearchParams, NotificationsCountParams } from '../../routes/schemas/notifications_schema';
export declare class NotificationsService {
    private readonly scopedClusterClient;
    private readonly mlSavedObjectService;
    private readonly enabledFeatures;
    constructor(scopedClusterClient: IScopedClusterClient, mlSavedObjectService: MLSavedObjectService, enabledFeatures: MlFeatures);
    private getDefaultCountResponse;
    /**
     * Provides entity IDs per type for the current space.
     * @internal
     */
    private _getEntityIdsPerType;
    /**
     * Searches notifications based on the criteria.
     *
     * {@link ML_NOTIFICATION_INDEX_PATTERN} uses job_id field for all types of entities,
     * e.g. anomaly_detector, data_frame_analytics jobs and inference models, hence
     * to make sure the results are space aware, we have to perform separate requests
     * for each type of entities.
     *
     */
    searchMessages(params: MessagesSearchParams): Promise<NotificationsSearchResponse>;
    /**
     * Provides a number of messages by level.
     */
    countMessages(params: NotificationsCountParams): Promise<NotificationsCountResponse>;
}
