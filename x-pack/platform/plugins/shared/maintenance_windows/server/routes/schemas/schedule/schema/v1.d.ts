export declare const scheduleRequestSchema: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        every?: string | undefined;
        end?: string | undefined;
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
        every?: string | undefined;
        end?: string | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
        occurrences?: number | undefined;
    } & {}> | undefined>;
}>;
