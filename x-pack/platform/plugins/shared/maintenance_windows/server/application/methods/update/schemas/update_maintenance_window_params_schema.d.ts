export declare const updateMaintenanceWindowParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    data: import("@kbn/config-schema").ObjectType<{
        title: import("@kbn/config-schema").Type<string | undefined>;
        enabled: import("@kbn/config-schema").Type<boolean | undefined>;
        duration: import("@kbn/config-schema").Type<number | undefined>;
        rRule: import("@kbn/config-schema").Type<Readonly<{
            freq?: 0 | 1 | 2 | 3 | 4 | undefined;
            interval?: number | undefined;
            until?: string | undefined;
            count?: number | undefined;
            byweekday?: string[] | undefined;
            bymonthday?: number[] | undefined;
            bymonth?: number[] | undefined;
        } & {
            dtstart: string;
            tzid: string;
        }> | undefined>;
        categoryIds: import("@kbn/config-schema").Type<("management" | "observability" | "securitySolution")[] | null | undefined>;
        scopedQuery: import("@kbn/config-schema").Type<Readonly<{
            dsl?: string | undefined;
        } & {
            kql: string;
            filters: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: import("@kbn/es-query-constants").FilterStateStore;
                }> | undefined;
            } & {
                meta: Record<string, any>;
            }>[];
        }> | null | undefined>;
        schedule: import("@kbn/config-schema").Type<Readonly<{} & {
            custom: Readonly<{
                timezone?: string | undefined;
                recurring?: Readonly<{
                    end?: string | undefined;
                    every?: string | undefined;
                    onWeekDay?: string[] | undefined;
                    onMonthDay?: number[] | undefined;
                    onMonth?: number[] | undefined;
                    occurrences?: number | undefined;
                } & {}> | undefined;
            } & {
                start: string;
                duration: string;
            }>;
        }> | undefined>;
        scope: import("@kbn/config-schema").Type<Readonly<{
            alerting?: Readonly<{
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
            } & {
                enabled: boolean;
            }> | undefined;
            alertingV2?: Readonly<{
                kql?: string | undefined;
            } & {
                enabled: boolean;
            }> | undefined;
        } & {}> | undefined>;
    }>;
}>;
