export declare const findMaintenanceWindowsRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    status: import("@kbn/config-schema").Type<"archived" | "disabled" | "finished" | "running" | "upcoming" | ("archived" | "disabled" | "finished" | "running" | "upcoming")[] | undefined>;
}>;
export declare const findMaintenanceWindowsResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        category_ids?: ("management" | "observability" | "securitySolution")[] | null | undefined;
        scoped_query?: Readonly<{
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
        } & {}> | null | undefined;
        scope?: Readonly<{
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
        } & {}> | undefined;
    } & {
        id: string;
        title: string;
        enabled: boolean;
        duration: number;
        expiration_date: string;
        events: Readonly<{} & {
            gte: string;
            lte: string;
        }>[];
        r_rule: Readonly<{
            freq?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
            until?: string | undefined;
            count?: number | undefined;
            interval?: number | undefined;
            wkst?: "FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE" | undefined;
            byweekday?: (string | number)[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byyearday?: number[] | null | undefined;
            byweekno?: number[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
        } & {
            dtstart: string;
            tzid: string;
        }>;
        created_by: string | null;
        updated_by: string | null;
        created_at: string;
        updated_at: string;
        event_start_time: string | null;
        event_end_time: string | null;
        status: "archived" | "disabled" | "finished" | "running" | "upcoming";
    }>[]>;
}>;
