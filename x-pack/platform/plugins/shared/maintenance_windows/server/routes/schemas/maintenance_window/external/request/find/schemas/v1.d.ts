export declare const findMaintenanceWindowsQuerySchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    created_by: import("@kbn/config-schema").Type<string | undefined>;
    status: import("@kbn/config-schema").Type<"disabled" | "running" | "upcoming" | "finished" | "archived" | ("disabled" | "running" | "upcoming" | "finished" | "archived")[] | undefined>;
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
        enabled: boolean;
        id: string;
        title: string;
        status: "disabled" | "running" | "upcoming" | "finished" | "archived";
        created_at: string;
        updated_at: string;
        created_by: string | null;
        updated_by: string | null;
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
    }>[]>;
}>;
