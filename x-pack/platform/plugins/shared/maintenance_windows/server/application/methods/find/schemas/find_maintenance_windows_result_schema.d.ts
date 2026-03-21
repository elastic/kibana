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
        enabled: boolean;
        id: string;
        title: string;
        status: "disabled" | "running" | "upcoming" | "finished" | "archived";
        duration: number;
        createdAt: string;
        schedule: Readonly<{} & {
            custom: Readonly<{
                timezone?: string | undefined;
                recurring?: Readonly<{
                    every?: string | undefined;
                    end?: string | undefined;
                    onWeekDay?: string[] | undefined;
                    onMonthDay?: number[] | undefined;
                    onMonth?: number[] | undefined;
                    occurrences?: number | undefined;
                } & {}> | undefined;
            } & {
                start: string;
                duration: string;
            }>;
        }>;
        events: Readonly<{} & {
            gte: string;
            lte: string;
        }>[];
        updatedAt: string;
        createdBy: string | null;
        updatedBy: string | null;
        expirationDate: string;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            wkst?: "TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            until?: string | undefined;
            freq?: 0 | 2 | 1 | 4 | 6 | 5 | 3 | undefined;
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
