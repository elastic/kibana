export declare const alertDeletePreviewQuerySchema: import("@kbn/config-schema").ObjectType<{
    active_alert_delete_threshold: import("@kbn/config-schema").Type<number | undefined>;
    inactive_alert_delete_threshold: import("@kbn/config-schema").Type<number | undefined>;
    category_ids: import("@kbn/config-schema").Type<"management" | "observability" | "securitySolution" | ("management" | "observability" | "securitySolution")[]>;
}>;
export declare const alertDeletePreviewResponseSchema: import("@kbn/config-schema").ObjectType<{
    affected_alert_count: import("@kbn/config-schema").Type<number>;
}>;
export declare const alertDeleteScheduleQuerySchema: import("@kbn/config-schema").ObjectType<{
    active_alert_delete_threshold: import("@kbn/config-schema").Type<number | undefined>;
    inactive_alert_delete_threshold: import("@kbn/config-schema").Type<number | undefined>;
    category_ids: import("@kbn/config-schema").Type<"management" | "observability" | "securitySolution" | ("management" | "observability" | "securitySolution")[]>;
    space_ids: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const alertDeleteLastRunResponseSchema: import("@kbn/config-schema").ObjectType<{
    last_run: import("@kbn/config-schema").Type<string | undefined>;
}>;
