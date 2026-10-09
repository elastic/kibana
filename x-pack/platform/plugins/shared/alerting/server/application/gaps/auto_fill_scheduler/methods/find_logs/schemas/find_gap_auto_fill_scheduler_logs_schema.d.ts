export declare const findGapAutoFillSchedulerLogsParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<string>;
    end: import("@kbn/config-schema").Type<string>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
    sortField: import("@kbn/config-schema").Type<string>;
    sortDirection: import("@kbn/config-schema").Type<"asc" | "desc">;
    statuses: import("@kbn/config-schema").Type<("error" | "no_gaps" | "skipped" | "success")[] | undefined>;
}>;
export declare const gapAutoFillSchedulerLogEntrySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    timestamp: import("@kbn/config-schema").Type<string | undefined>;
    status: import("@kbn/config-schema").Type<string | undefined>;
    message: import("@kbn/config-schema").Type<string | undefined>;
    results: import("@kbn/config-schema").Type<Readonly<{
        ruleId?: string | undefined;
        processedGaps?: number | undefined;
        status?: string | undefined;
        error?: string | undefined;
    } & {}>[] | undefined>;
}>;
export declare const gapAutoFillSchedulerLogsResultSchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{
        timestamp?: string | undefined;
        status?: string | undefined;
        message?: string | undefined;
        results?: Readonly<{
            ruleId?: string | undefined;
            processedGaps?: number | undefined;
            status?: string | undefined;
            error?: string | undefined;
        } & {}>[] | undefined;
    } & {
        id: string;
    }>[]>;
    total: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
}>;
