export declare const rawMaintenanceWindowSchema: import("@kbn/config-schema").ObjectType<Omit<{
    categoryIds: import("@kbn/config-schema").Type<string[] | null | undefined>;
    createdAt: import("@kbn/config-schema").Type<string>;
    createdBy: import("@kbn/config-schema").Type<string | null>;
    duration: import("@kbn/config-schema").Type<number>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    events: import("@kbn/config-schema").Type<Readonly<{} & {
        gte: string;
        lte: string;
    }>[]>;
    expirationDate: import("@kbn/config-schema").Type<string>;
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
    title: import("@kbn/config-schema").Type<string>;
    updatedAt: import("@kbn/config-schema").Type<string>;
    updatedBy: import("@kbn/config-schema").Type<string | null>;
}, "scope" | "schedule"> & {
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
}>;
