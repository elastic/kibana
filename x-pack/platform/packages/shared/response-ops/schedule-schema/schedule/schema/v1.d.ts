interface GetScheduleSchemaOptions {
    metaId?: string;
    recurringMetaId?: string;
    allowLastDayOfMonth?: boolean;
}
export declare const getScheduleRequestSchema: ({ metaId, recurringMetaId, allowLastDayOfMonth, }?: GetScheduleSchemaOptions) => import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        end?: string | undefined;
        every?: string | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
        occurrences?: number | undefined;
    } & {}> | undefined>;
}>;
export declare const scheduleRequestSchema: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        end?: string | undefined;
        every?: string | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
        occurrences?: number | undefined;
    } & {}> | undefined>;
}>;
export declare const getScheduleResponseSchema: ({ metaId, recurringMetaId, allowLastDayOfMonth, }?: GetScheduleSchemaOptions) => import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        end?: string | undefined;
        every?: string | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
        occurrences?: number | undefined;
    } & {}> | undefined>;
}>;
export declare const scheduleResponseSchema: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        end?: string | undefined;
        every?: string | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
        occurrences?: number | undefined;
    } & {}> | undefined>;
}>;
export {};
