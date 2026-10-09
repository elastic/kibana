export declare const maintenanceWindowResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    title: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    created_by: import("@kbn/config-schema").Type<string | null>;
    updated_by: import("@kbn/config-schema").Type<string | null>;
    created_at: import("@kbn/config-schema").Type<string>;
    updated_at: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<"archived" | "disabled" | "finished" | "running" | "upcoming">;
    scope: import("@kbn/config-schema").Type<Readonly<{
        alerting_v2?: Readonly<{
            enabled?: boolean | undefined;
            query?: Readonly<{} & {
                kql: string;
            }> | undefined;
        } & {}> | undefined;
    } & {
        alerting: Readonly<{
            enabled?: boolean | undefined;
        } & {
            query: Readonly<{} & {
                kql: string;
            }>;
        }>;
    }> | undefined>;
    schedule: import("@kbn/config-schema").ObjectType<{
        custom: import("@kbn/config-schema").ObjectType<{
            start: import("@kbn/config-schema").Type<string>;
            duration: import("@kbn/config-schema").Type<string>;
            timezone: import("@kbn/config-schema").Type<string | undefined>;
            recurring: import("@kbn/config-schema").Type<Readonly<{
                end?: string | undefined;
                every?: string | undefined;
                onWeekDay?: string[] | undefined;
                onMonthDay?: number[] | undefined;
                onMonth?: number[] | undefined;
                occurrences?: number | undefined;
            } & {}> | undefined>;
        }>;
    }>;
}>;
