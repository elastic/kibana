export declare const maintenanceWindowsStatusSchema: import("@kbn/config-schema").Type<"archived" | "disabled" | "running" | "upcoming" | "finished">;
export declare const findMaintenanceWindowsParamsSchema: import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").Type<("archived" | "disabled" | "running" | "upcoming" | "finished")[] | undefined>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    searchFields: import("@kbn/config-schema").Type<string[] | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    page: import("@kbn/config-schema").Type<number | undefined>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
