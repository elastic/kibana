export declare const jobAuditMessagesJobIdSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const jobAuditMessagesQuerySchema: import("@kbn/config-schema").ObjectType<{
    from: import("@kbn/config-schema").Type<string | undefined>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    end: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const clearJobAuditMessagesBodySchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    notificationIndices: import("@kbn/config-schema").Type<string[]>;
}>;
