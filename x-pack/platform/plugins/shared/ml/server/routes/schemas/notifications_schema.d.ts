import type { TypeOf } from '@kbn/config-schema';
export declare const getNotificationsQuerySchema: import("@kbn/config-schema").ObjectType<{
    queryString: import("@kbn/config-schema").Type<string | undefined>;
    sortField: import("@kbn/config-schema").Type<"timestamp" | "level" | "job_id" | "job_type">;
    sortDirection: import("@kbn/config-schema").Type<"asc" | "desc">;
    earliest: import("@kbn/config-schema").Type<string | undefined>;
    latest: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const getNotificationsCountQuerySchema: import("@kbn/config-schema").ObjectType<{
    lastCheckedAt: import("@kbn/config-schema").Type<number>;
}>;
export type MessagesSearchParams = TypeOf<typeof getNotificationsQuerySchema>;
export type NotificationsCountParams = TypeOf<typeof getNotificationsCountQuerySchema>;
