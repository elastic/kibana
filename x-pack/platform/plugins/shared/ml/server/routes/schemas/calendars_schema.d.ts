export declare const calendarSchema: import("@kbn/config-schema").ObjectType<{
    calendarId: import("@kbn/config-schema").Type<string>;
    calendar_id: import("@kbn/config-schema").Type<string | undefined>;
    job_ids: import("@kbn/config-schema").Type<string[]>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    total_job_count: import("@kbn/config-schema").Type<number | undefined>;
    events: import("@kbn/config-schema").Type<Readonly<{
        description?: string | undefined;
        skip_model_update?: boolean | undefined;
        skip_result?: boolean | undefined;
        force_time_shift?: number | undefined;
        calendar_id?: string | undefined;
        event_id?: string | undefined;
    } & {
        start_time: string | number;
        end_time: string | number;
    }>[]>;
}>;
export declare const calendarIdSchema: import("@kbn/config-schema").ObjectType<{
    calendarId: import("@kbn/config-schema").Type<string>;
}>;
export declare const calendarIdsSchema: import("@kbn/config-schema").ObjectType<{
    calendarIds: import("@kbn/config-schema").Type<string>;
}>;
