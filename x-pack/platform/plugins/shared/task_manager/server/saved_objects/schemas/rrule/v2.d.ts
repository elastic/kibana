import type { Frequency } from '@kbn/rrule';
export declare const rruleCommon: import("@kbn/config-schema").ObjectType<Omit<{
    freq: import("@kbn/config-schema").Type<0 | 1 | 5 | 6 | 2 | 4 | 3>;
    interval: import("@kbn/config-schema").Type<number>;
    tzid: import("@kbn/config-schema").Type<string>;
}, "dtstart"> & {
    dtstart: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const rruleMonthly: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    freq: import("@kbn/config-schema").Type<0 | 1 | 5 | 6 | 2 | 4 | 3>;
    interval: import("@kbn/config-schema").Type<number>;
    tzid: import("@kbn/config-schema").Type<string>;
}, "dtstart"> & {
    dtstart: import("@kbn/config-schema").Type<string | undefined>;
}, "bymonthday" | "byweekday" | "byhour" | "byminute" | "freq"> & {
    bymonthday: import("@kbn/config-schema").Type<number[] | undefined>;
    byweekday: import("@kbn/config-schema").Type<string[] | undefined>;
    byhour: import("@kbn/config-schema").Type<number[] | undefined>;
    byminute: import("@kbn/config-schema").Type<number[] | undefined>;
    freq: import("@kbn/config-schema").Type<Frequency.MONTHLY>;
}>;
export declare const rruleWeekly: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    freq: import("@kbn/config-schema").Type<0 | 1 | 5 | 6 | 2 | 4 | 3>;
    interval: import("@kbn/config-schema").Type<number>;
    tzid: import("@kbn/config-schema").Type<string>;
}, "dtstart"> & {
    dtstart: import("@kbn/config-schema").Type<string | undefined>;
}, "bymonthday" | "byweekday" | "byhour" | "byminute" | "freq"> & {
    bymonthday: import("@kbn/config-schema").Type<never>;
    byweekday: import("@kbn/config-schema").Type<string[] | undefined>;
    byhour: import("@kbn/config-schema").Type<number[] | undefined>;
    byminute: import("@kbn/config-schema").Type<number[] | undefined>;
    freq: import("@kbn/config-schema").Type<Frequency.WEEKLY>;
}>;
export declare const rruleDaily: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    freq: import("@kbn/config-schema").Type<0 | 1 | 5 | 6 | 2 | 4 | 3>;
    interval: import("@kbn/config-schema").Type<number>;
    tzid: import("@kbn/config-schema").Type<string>;
}, "dtstart"> & {
    dtstart: import("@kbn/config-schema").Type<string | undefined>;
}, "bymonthday" | "byweekday" | "byhour" | "byminute" | "freq"> & {
    bymonthday: import("@kbn/config-schema").Type<never>;
    byweekday: import("@kbn/config-schema").Type<string[] | undefined>;
    byhour: import("@kbn/config-schema").Type<number[] | undefined>;
    byminute: import("@kbn/config-schema").Type<number[] | undefined>;
    freq: import("@kbn/config-schema").Type<Frequency.DAILY>;
}>;
export declare const rruleSchedule: import("@kbn/config-schema").Type<Readonly<{
    bymonthday?: number[] | undefined;
    byweekday?: string[] | undefined;
    byhour?: number[] | undefined;
    byminute?: number[] | undefined;
    dtstart?: string | undefined;
} & {
    interval: number;
    freq: Frequency.MONTHLY;
    tzid: string;
}> | Readonly<{
    byweekday?: string[] | undefined;
    byhour?: number[] | undefined;
    byminute?: number[] | undefined;
    dtstart?: string | undefined;
} & {
    interval: number;
    bymonthday: never;
    freq: Frequency.WEEKLY;
    tzid: string;
}> | Readonly<{
    byweekday?: string[] | undefined;
    byhour?: number[] | undefined;
    byminute?: number[] | undefined;
    dtstart?: string | undefined;
} & {
    interval: number;
    bymonthday: never;
    freq: Frequency.DAILY;
    tzid: string;
}>>;
export declare const scheduleRruleSchema: import("@kbn/config-schema").ObjectType<{
    rrule: import("@kbn/config-schema").Type<Readonly<{
        bymonthday?: number[] | undefined;
        byweekday?: string[] | undefined;
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        dtstart?: string | undefined;
    } & {
        interval: number;
        freq: Frequency.MONTHLY;
        tzid: string;
    }> | Readonly<{
        byweekday?: string[] | undefined;
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        dtstart?: string | undefined;
    } & {
        interval: number;
        bymonthday: never;
        freq: Frequency.WEEKLY;
        tzid: string;
    }> | Readonly<{
        byweekday?: string[] | undefined;
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
        dtstart?: string | undefined;
    } & {
        interval: number;
        bymonthday: never;
        freq: Frequency.DAILY;
        tzid: string;
    }>>;
}>;
