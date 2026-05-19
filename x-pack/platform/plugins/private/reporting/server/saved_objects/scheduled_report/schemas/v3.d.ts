export * from './v2';
export declare const rawScheduledReportSchema: import("@kbn/config-schema").ObjectType<Omit<Omit<{
    createdAt: import("@kbn/config-schema").Type<string>;
    createdBy: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    jobType: import("@kbn/config-schema").Type<string>;
    meta: import("@kbn/config-schema").ObjectType<{
        isDeprecated: import("@kbn/config-schema").Type<boolean | undefined>;
        layout: import("@kbn/config-schema").Type<"canvas" | "print" | "preserve_layout" | undefined>;
        objectType: import("@kbn/config-schema").Type<string>;
    }>;
    migrationVersion: import("@kbn/config-schema").Type<string | undefined>;
    notification: import("@kbn/config-schema").Type<Readonly<{
        email?: Readonly<{
            to?: string[] | undefined;
            cc?: string[] | undefined;
            bcc?: string[] | undefined;
        } & {}> | undefined;
    } & {}> | undefined>;
    payload: import("@kbn/config-schema").Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        rrule: import("@kbn/config-schema").Type<Readonly<{
            bymonthday?: number[] | undefined;
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
        } & {
            interval: number;
            freq: import("@kbn/rrule/types").Frequency.MONTHLY;
            tzid: string;
        }> | Readonly<{
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
        } & {
            interval: number;
            bymonthday: never;
            freq: import("@kbn/rrule/types").Frequency.WEEKLY;
            tzid: string;
        }> | Readonly<{
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
        } & {
            interval: number;
            bymonthday: never;
            freq: import("@kbn/rrule/types").Frequency.DAILY;
            tzid: string;
        }>>;
    }>;
    title: import("@kbn/config-schema").Type<string>;
}, "schedule"> & {
    schedule: import("@kbn/config-schema").ObjectType<{
        rrule: import("@kbn/config-schema").Type<Readonly<{
            bymonthday?: number[] | undefined;
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
            dtstart?: string | undefined;
        } & {
            interval: number;
            freq: import("@kbn/rrule/types").Frequency.MONTHLY;
            tzid: string;
        }> | Readonly<{
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
            dtstart?: string | undefined;
        } & {
            interval: number;
            bymonthday: never;
            freq: import("@kbn/rrule/types").Frequency.WEEKLY;
            tzid: string;
        }> | Readonly<{
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
            dtstart?: string | undefined;
        } & {
            interval: number;
            bymonthday: never;
            freq: import("@kbn/rrule/types").Frequency.DAILY;
            tzid: string;
        }>>;
    }>;
}, "schedule"> & {
    schedule: import("@kbn/config-schema").ObjectType<{
        rrule: import("@kbn/config-schema").Type<Readonly<{
            bymonthday?: number[] | undefined;
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
            dtstart?: string | undefined;
        } & {
            interval: number;
            freq: import("@kbn/rrule/types").Frequency.MONTHLY;
            tzid: string;
        }> | Readonly<{
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
            dtstart?: string | undefined;
        } & {
            interval: number;
            bymonthday: never;
            freq: import("@kbn/rrule/types").Frequency.WEEKLY;
            tzid: string;
        }> | Readonly<{
            byweekday?: string[] | undefined;
            byhour?: number[] | undefined;
            byminute?: number[] | undefined;
            dtstart?: string | undefined;
        } & {
            interval: number;
            bymonthday: never;
            freq: import("@kbn/rrule/types").Frequency.DAILY;
            tzid: string;
        }> | Readonly<{
            byminute?: number[] | undefined;
            dtstart?: string | undefined;
        } & {
            interval: number;
            bymonthday: never;
            byweekday: never;
            byhour: never;
            freq: import("@kbn/rrule/types").Frequency.HOURLY;
            tzid: string;
        }>>;
    }>;
}>;
