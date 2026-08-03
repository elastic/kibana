import type { TypeOf } from '@kbn/config-schema';
export declare const scheduleRequestSchema: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        every?: string | undefined;
        end?: string | undefined;
        occurrences?: number | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
    } & {}> | undefined>;
}>;
export declare const scheduleResponseSchema: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        every?: string | undefined;
        end?: string | undefined;
        occurrences?: number | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
    } & {}> | undefined>;
}>;
export declare const scheduleRequestSchemaV1: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        every?: string | undefined;
        end?: string | undefined;
        occurrences?: number | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
    } & {}> | undefined>;
}>;
export declare const scheduleResponseSchemaV1: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<string>;
    duration: import("@kbn/config-schema").Type<string>;
    timezone: import("@kbn/config-schema").Type<string | undefined>;
    recurring: import("@kbn/config-schema").Type<Readonly<{
        every?: string | undefined;
        end?: string | undefined;
        occurrences?: number | undefined;
        onWeekDay?: string[] | undefined;
        onMonthDay?: number[] | undefined;
        onMonth?: number[] | undefined;
    } & {}> | undefined>;
}>;
export type ScheduleRequest = TypeOf<typeof scheduleRequestSchema>;
export type ScheduleResponse = TypeOf<typeof scheduleResponseSchema>;
export type ScheduleRequestV1 = ScheduleRequest;
export type ScheduleResponseV1 = ScheduleResponse;
