export declare const maintenanceWindowEventSchema: import("@kbn/config-schema").ObjectType<{
    gte: import("@kbn/config-schema").Type<string>;
    lte: import("@kbn/config-schema").Type<string>;
}>;
export declare const maintenanceWindowResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    title: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    duration: import("@kbn/config-schema").Type<number>;
    expiration_date: import("@kbn/config-schema").Type<string>;
    events: import("@kbn/config-schema").Type<Readonly<{} & {
        gte: string;
        lte: string;
    }>[]>;
    r_rule: import("@kbn/config-schema").ObjectType<{
        dtstart: import("@kbn/config-schema").Type<string>;
        tzid: import("@kbn/config-schema").Type<string>;
        freq: import("@kbn/config-schema").Type<0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined>;
        until: import("@kbn/config-schema").Type<string | undefined>;
        count: import("@kbn/config-schema").Type<number | undefined>;
        interval: import("@kbn/config-schema").Type<number | undefined>;
        wkst: import("@kbn/config-schema").Type<"FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE" | undefined>;
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
    created_by: import("@kbn/config-schema").Type<string | null>;
    updated_by: import("@kbn/config-schema").Type<string | null>;
    created_at: import("@kbn/config-schema").Type<string>;
    updated_at: import("@kbn/config-schema").Type<string>;
    event_start_time: import("@kbn/config-schema").Type<string | null>;
    event_end_time: import("@kbn/config-schema").Type<string | null>;
    status: import("@kbn/config-schema").Type<"archived" | "disabled" | "finished" | "running" | "upcoming">;
    category_ids: import("@kbn/config-schema").Type<("management" | "observability" | "securitySolution")[] | null | undefined>;
    scoped_query: import("@kbn/config-schema").Type<Readonly<{
        enabled?: boolean | undefined;
        kql?: string | undefined;
        filters?: Readonly<{
            query?: Record<string, any> | undefined;
            $state?: Readonly<{} & {
                store: import("@kbn/es-query-constants").FilterStateStore;
            }> | undefined;
        } & {
            meta: Record<string, any>;
        }>[] | undefined;
        dsl?: string | undefined;
    } & {}> | null | undefined>;
    scope: import("@kbn/config-schema").Type<Readonly<{
        alerting?: Readonly<{
            enabled?: boolean | undefined;
            kql?: string | undefined;
            filters?: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: import("@kbn/es-query-constants").FilterStateStore;
                }> | undefined;
            } & {
                meta: Record<string, any>;
            }>[] | undefined;
            dsl?: string | undefined;
        } & {}> | undefined;
        alerting_v2?: Readonly<{
            kql?: string | undefined;
        } & {
            enabled: boolean;
        }> | undefined;
    } & {}> | undefined>;
}>;
