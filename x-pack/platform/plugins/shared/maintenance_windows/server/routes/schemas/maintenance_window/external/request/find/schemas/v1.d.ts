export declare const findMaintenanceWindowsQuerySchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    created_by: import("@kbn/config-schema").Type<string | undefined>;
    status: import("@kbn/config-schema").Type<"archived" | "disabled" | "finished" | "running" | "upcoming" | ("archived" | "disabled" | "finished" | "running" | "upcoming")[] | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
}>;
export declare const findMaintenanceWindowsResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    maintenanceWindows: import("@kbn/config-schema").Type<Readonly<{
        scope?: Readonly<{
            alerting_v2?: Readonly<{
                enabled?: boolean | undefined;
                query?: Readonly<{} & {
                    kql: string;
                }> | undefined;
            } & {}> | undefined;
        } & {
            alerting: Readonly<{
                enabled?: boolean | undefined;
            } & {
                query: Readonly<{} & {
                    kql: string;
                }>;
            }>;
        }> | undefined;
    } & {
        id: string;
        title: string;
        enabled: boolean;
        created_by: string | null;
        updated_by: string | null;
        created_at: string;
        updated_at: string;
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
}>;
