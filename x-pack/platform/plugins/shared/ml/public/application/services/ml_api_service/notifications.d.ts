import type { NotificationsQueryParams, NotificationsSearchResponse } from '@kbn/ml-common-types/notifications';
import type { NotificationsCountQueryParams, NotificationsCountResponse } from '@kbn/ml-common-types/notifications';
import type { HttpService } from '../http_service';
export declare function notificationsProvider(httpService: HttpService): {
    findMessages(params: NotificationsQueryParams): Promise<NotificationsSearchResponse>;
    countMessages$(params: NotificationsCountQueryParams): import("rxjs").Observable<NotificationsCountResponse>;
};
