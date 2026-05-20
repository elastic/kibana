export declare const findMaintenanceWindowsResultSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
    data: import("@kbn/config-schema").Type<Readonly<{
        scope?: Readonly<{} & {
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
        }> | undefined;
        categoryIds?: ("observability" | "management" | "securitySolution")[] | null | undefined;
        scopedQuery?: Readonly<{
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
        status: "archived" | "disabled" | "running" | "finished" | "upcoming";
        id: string;
        title: string;
        duration: number;
        enabled: boolean;
        updatedAt: string;
        schedule: Readonly<{} & {
            custom: Readonly<{
                recurring?: Readonly<{
                    every?: string | undefined;
                    end?: string | undefined;
                    onWeekDay?: string[] | undefined;
                    onMonthDay?: number[] | undefined;
                    onMonth?: number[] | undefined;
                    occurrences?: number | undefined;
                } & {}> | undefined;
                timezone?: string | undefined;
            } & {
                duration: string;
                start: string;
            }>;
        }>;
        createdAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        expirationDate: string;
        events: Readonly<{} & {
            gte: string;
            lte: string;
        }>[];
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            wkst?: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            freq?: 0 | 2 | 1 | 4 | 5 | 3 | 6 | undefined;
            until?: string | undefined;
            byweekno?: number[] | null | undefined;
        } & {
            dtstart: string;
            tzid: string;
        }>;
        eventStartTime: string | null;
        eventEndTime: string | null;
    }>[]>;
    total: import("@kbn/config-schema").Type<number>;
}>;
