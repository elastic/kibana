export declare const updateScheduledReportSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string | undefined>;
    schedule: import("@kbn/config-schema").Type<Readonly<{} & {
        rrule: Readonly<{
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
        }>;
    }> | undefined>;
    notification: import("@kbn/config-schema").Type<Readonly<{
        email?: Readonly<{
            to?: string[] | undefined;
            cc?: string[] | undefined;
            bcc?: string[] | undefined;
            message?: string | undefined;
            subject?: string | undefined;
        } & {}> | null | undefined;
    } & {}> | undefined>;
}>;
