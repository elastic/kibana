export declare const bulkGetMaintenanceWindowsErrorSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    error: import("@kbn/config-schema").Type<string>;
    message: import("@kbn/config-schema").Type<string>;
    statusCode: import("@kbn/config-schema").Type<number>;
}>;
export declare const bulkGetMaintenanceWindowsResultSchema: import("@kbn/config-schema").ObjectType<{
    maintenanceWindows: import("@kbn/config-schema").Type<Readonly<{
        categoryIds?: ("management" | "observability" | "securitySolution")[] | null | undefined;
        scopedQuery?: Readonly<{
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
        }> | null | undefined;
        scope?: Readonly<{
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
        } & {}> | undefined;
    } & {
        id: string;
        title: string;
        enabled: boolean;
        duration: number;
        expirationDate: string;
        events: Readonly<{} & {
            gte: string;
            lte: string;
        }>[];
        rRule: Readonly<{
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
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: string;
        updatedAt: string;
        eventStartTime: string | null;
        eventEndTime: string | null;
        status: "archived" | "disabled" | "finished" | "running" | "upcoming";
        schedule: Readonly<{} & {
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
        }>;
    }>[]>;
    errors: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        error: string;
        message: string;
        statusCode: number;
    }>[]>;
}>;
