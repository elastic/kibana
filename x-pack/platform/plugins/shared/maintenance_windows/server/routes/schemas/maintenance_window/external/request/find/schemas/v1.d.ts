export declare const findMaintenanceWindowsQuerySchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    created_by: import("@kbn/config-schema").Type<string | undefined>;
    status: import("@kbn/config-schema").Type<"archived" | "disabled" | "running" | "finished" | "upcoming" | ("archived" | "disabled" | "running" | "finished" | "upcoming")[] | undefined>;
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
        status: "archived" | "disabled" | "running" | "finished" | "upcoming";
        id: string;
        title: string;
        enabled: boolean;
        updated_at: string;
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
        updated_by: string | null;
        created_at: string;
        created_by: string | null;
    }>[]>;
}>;
