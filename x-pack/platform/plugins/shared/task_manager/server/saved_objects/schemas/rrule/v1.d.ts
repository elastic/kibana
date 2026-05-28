import { Frequency } from '@kbn/rrule';
export declare function validateTimezone(timezone: string): string | undefined;
export declare const rruleCommon: import("@kbn/config-schema").ObjectType<{
    freq: import("@kbn/config-schema").Type<0 | 2 | 1 | 3 | 5 | 4 | 6>;
    interval: import("@kbn/config-schema").Type<number>;
    tzid: import("@kbn/config-schema").Type<string>;
}>;
export declare const byminute: import("@kbn/config-schema").Type<number[] | undefined>;
export declare const byhour: import("@kbn/config-schema").Type<number[] | undefined>;
export declare const byweekday: import("@kbn/config-schema").Type<string[] | undefined>;
export declare const bymonthday: import("@kbn/config-schema").Type<number[] | undefined>;
export declare const rruleSchedule: import("@kbn/config-schema").Type<Readonly<{
    bymonthday?: number[] | undefined;
    byweekday?: string[] | undefined;
    byhour?: number[] | undefined;
    byminute?: number[] | undefined;
} & {
    interval: number;
    freq: Frequency.MONTHLY;
    tzid: string;
}> | Readonly<{
    byweekday?: string[] | undefined;
    byhour?: number[] | undefined;
    byminute?: number[] | undefined;
} & {
    interval: number;
    bymonthday: never;
    freq: Frequency.WEEKLY;
    tzid: string;
}> | Readonly<{
    byweekday?: string[] | undefined;
    byhour?: number[] | undefined;
    byminute?: number[] | undefined;
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
    } & {
        interval: number;
        freq: Frequency.MONTHLY;
        tzid: string;
    }> | Readonly<{
        byweekday?: string[] | undefined;
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
    } & {
        interval: number;
        bymonthday: never;
        freq: Frequency.WEEKLY;
        tzid: string;
    }> | Readonly<{
        byweekday?: string[] | undefined;
        byhour?: number[] | undefined;
        byminute?: number[] | undefined;
    } & {
        interval: number;
        bymonthday: never;
        freq: Frequency.DAILY;
        tzid: string;
    }>>;
}>;
