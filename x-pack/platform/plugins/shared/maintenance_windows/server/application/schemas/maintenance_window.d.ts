export declare const maintenanceWindowEventSchema: import("@kbn/config-schema").ObjectType<{
    gte: import("@kbn/config-schema").Type<string>;
    lte: import("@kbn/config-schema").Type<string>;
}>;
export declare const maintenanceWindowCategoryIdsSchema: import("@kbn/config-schema").Type<("observability" | "management" | "securitySolution")[] | null | undefined>;
export declare const maintenanceWindowSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    title: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    duration: import("@kbn/config-schema").Type<number>;
    expirationDate: import("@kbn/config-schema").Type<string>;
    events: import("@kbn/config-schema").Type<Readonly<{} & {
        gte: string;
        lte: string;
    }>[]>;
    rRule: import("@kbn/config-schema").ObjectType<{
        dtstart: import("@kbn/config-schema").Type<string>;
        tzid: import("@kbn/config-schema").Type<string>;
        freq: import("@kbn/config-schema").Type<0 | 2 | 1 | 4 | 5 | 3 | 6 | undefined>;
        until: import("@kbn/config-schema").Type<string | undefined>;
        count: import("@kbn/config-schema").Type<number | undefined>;
        interval: import("@kbn/config-schema").Type<number | undefined>;
        wkst: import("@kbn/config-schema").Type<"MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined>;
        byweekday: import("@kbn/config-schema").Type<(string | number)[] | null | undefined>;
        bymonth: import("@kbn/config-schema").Type<number[] | null | undefined>;
        bysetpos: import("@kbn/config-schema").Type<number[] | null | undefined>;
        bymonthday: import("@kbn/config-schema").Type<number[] | null | undefined>;
        byyearday: import("@kbn/config-schema").Type<number[] | null | undefined>;
        byweekno: import("@kbn/config-schema").Type<number[] | null | undefined>;
        byhour: import("@kbn/config-schema").Type<number[] | null | undefined>;
        byminute: import("@kbn/config-schema").Type<number[] | null | undefined>;
        bysecond: import("@kbn/config-schema").Type<number[] | null | undefined>;
    }>;
    createdBy: import("@kbn/config-schema").Type<string | null>;
    updatedBy: import("@kbn/config-schema").Type<string | null>;
    createdAt: import("@kbn/config-schema").Type<string>;
    updatedAt: import("@kbn/config-schema").Type<string>;
    eventStartTime: import("@kbn/config-schema").Type<string | null>;
    eventEndTime: import("@kbn/config-schema").Type<string | null>;
    status: import("@kbn/config-schema").Type<"archived" | "disabled" | "running" | "finished" | "upcoming">;
    categoryIds: import("@kbn/config-schema").Type<("observability" | "management" | "securitySolution")[] | null | undefined>;
    scopedQuery: import("@kbn/config-schema").Type<Readonly<{
        dsl?: string | undefined;
    } & {
        filters: Readonly<{
            query?: Record<string, any> | undefined;
            $state?: Readonly<{} & {
                store: import("@kbn/es-query-constants").FilterStateStore;
            }> | undefined;
        } & {
            meta: Record<string, any>;
        }>[];
        kql: string;
    }> | null | undefined>;
    schedule: import("@kbn/config-schema").ObjectType<{
        custom: import("@kbn/config-schema").ObjectType<{
            start: import("@kbn/config-schema").Type<string>;
            duration: import("@kbn/config-schema").Type<string>;
            timezone: import("@kbn/config-schema").Type<string | undefined>;
            recurring: import("@kbn/config-schema").Type<Readonly<{
                every?: string | undefined;
                end?: string | undefined;
                onWeekDay?: string[] | undefined;
                onMonthDay?: number[] | undefined;
                onMonth?: number[] | undefined;
                occurrences?: number | undefined;
            } & {}> | undefined>;
        }>;
    }>;
    scope: import("@kbn/config-schema").Type<Readonly<{} & {
        alerting: Readonly<{
            dsl?: string | undefined;
        } & {
            filters: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: import("@kbn/es-query-constants").FilterStateStore;
                }> | undefined;
            } & {
                meta: Record<string, any>;
            }>[];
            kql: string;
        }> | null;
    }> | undefined>;
}>;
