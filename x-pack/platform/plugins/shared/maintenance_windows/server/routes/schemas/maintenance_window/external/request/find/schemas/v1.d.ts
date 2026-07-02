export declare const findMaintenanceWindowsQuerySchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    created_by: import("@kbn/config-schema").Type<string | undefined>;
    status: import("@kbn/config-schema").Type<"archived" | "disabled" | "running" | "upcoming" | "finished" | ("archived" | "disabled" | "running" | "upcoming" | "finished")[] | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
}>;
export declare const findMaintenanceWindowsResponseSchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    total: import("@kbn/config-schema").Type<number>;
    maintenanceWindows: import("@kbn/config-schema").Type<Readonly<{
        scope?: Readonly<{} & {
            alerting: Readonly<{} & {
                query: Readonly<{} & {
                    kql: string;
                }>;
            }>;
        }> | undefined;
    } & {
        id: string;
        title: string;
        status: "archived" | "disabled" | "running" | "upcoming" | "finished";
        created_at: string;
        updated_at: string;
        enabled: boolean;
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
                duration: string;
                start: string;
            }>;
        }>;
        created_by: string | null;
        updated_by: string | null;
    }>[]>;
}>;
