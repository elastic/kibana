export declare const updateParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const updateBodySchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    duration: import("@kbn/config-schema").Type<number | undefined>;
    r_rule: import("@kbn/config-schema").Type<Readonly<{
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
