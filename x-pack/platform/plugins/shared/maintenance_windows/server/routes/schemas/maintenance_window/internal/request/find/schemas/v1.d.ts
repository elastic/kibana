export declare const findMaintenanceWindowsRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    status: import("@kbn/config-schema").Type<"disabled" | "running" | "finished" | "upcoming" | "archived" | ("disabled" | "running" | "finished" | "upcoming" | "archived")[] | undefined>;
}>;
export declare const findMaintenanceWindowsResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        category_ids?: ("management" | "observability" | "securitySolution")[] | null | undefined;
        scoped_query?: Readonly<{
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
        }> | null | undefined;
    } & {
        id: string;
        title: string;
        enabled: boolean;
        status: "disabled" | "running" | "finished" | "upcoming" | "archived";
        created_at: string;
        created_by: string | null;
        updated_at: string;
        updated_by: string | null;
        duration: number;
        events: Readonly<{} & {
            gte: string;
            lte: string;
        }>[];
        expiration_date: string;
        r_rule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            until?: string | undefined;
            wkst?: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            freq?: 0 | 1 | 2 | 3 | 5 | 4 | 6 | undefined;
            byweekno?: number[] | null | undefined;
        } & {
            dtstart: string;
            tzid: string;
        }>;
        event_start_time: string | null;
        event_end_time: string | null;
    }>[]>;
}>;
