import type { TypeOf } from '@kbn/config-schema';
export declare const stateSchemaByVersion: {
    1: {
        up: (state: Record<string, unknown>) => {
            has_errors: {};
            error_messages: {} | undefined;
            runs: {};
            number_of_scheduled_reports: {};
            number_of_enabled_scheduled_reports: {};
            number_of_scheduled_reports_by_type: {};
            number_of_enabled_scheduled_reports_by_type: {};
            number_of_scheduled_reports_with_notifications: {};
        };
        schema: import("@kbn/config-schema").ObjectType<{
            has_errors: import("@kbn/config-schema").Type<boolean>;
            error_messages: import("@kbn/config-schema").Type<any[] | undefined>;
            runs: import("@kbn/config-schema").Type<number>;
            number_of_scheduled_reports: import("@kbn/config-schema").Type<number>;
            number_of_enabled_scheduled_reports: import("@kbn/config-schema").Type<number>;
            number_of_scheduled_reports_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
            number_of_enabled_scheduled_reports_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
            number_of_scheduled_reports_with_notifications: import("@kbn/config-schema").Type<number>;
        }>;
    };
};
declare const latestTaskStateSchema: import("@kbn/config-schema").ObjectType<{
    has_errors: import("@kbn/config-schema").Type<boolean>;
    error_messages: import("@kbn/config-schema").Type<any[] | undefined>;
    runs: import("@kbn/config-schema").Type<number>;
    number_of_scheduled_reports: import("@kbn/config-schema").Type<number>;
    number_of_enabled_scheduled_reports: import("@kbn/config-schema").Type<number>;
    number_of_scheduled_reports_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
    number_of_enabled_scheduled_reports_by_type: import("@kbn/config-schema").Type<Record<string, number>>;
    number_of_scheduled_reports_with_notifications: import("@kbn/config-schema").Type<number>;
}>;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
export declare const emptyState: LatestTaskStateSchema;
export {};
