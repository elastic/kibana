interface GetRRuleRequestSchemaOptions {
    meta?: {
        id: string;
    };
    validateTimezone?: (timezone: string) => string | undefined;
}
export declare const getRRuleRequestSchema: ({ meta, validateTimezone, }?: GetRRuleRequestSchemaOptions) => import("@kbn/config-schema").ObjectType<{
    dtstart: import("@kbn/config-schema").Type<string>;
    tzid: import("@kbn/config-schema").Type<string>;
    freq: import("@kbn/config-schema").Type<0 | 1 | 2 | 3 | 4 | undefined>;
    interval: import("@kbn/config-schema").Type<number | undefined>;
    until: import("@kbn/config-schema").Type<string | undefined>;
    count: import("@kbn/config-schema").Type<number | undefined>;
    byweekday: import("@kbn/config-schema").Type<string[] | undefined>;
    bymonthday: import("@kbn/config-schema").Type<number[] | undefined>;
    bymonth: import("@kbn/config-schema").Type<number[] | undefined>;
}>;
export declare const rRuleRequestSchema: import("@kbn/config-schema").ObjectType<{
    dtstart: import("@kbn/config-schema").Type<string>;
    tzid: import("@kbn/config-schema").Type<string>;
    freq: import("@kbn/config-schema").Type<0 | 1 | 2 | 3 | 4 | undefined>;
    interval: import("@kbn/config-schema").Type<number | undefined>;
    until: import("@kbn/config-schema").Type<string | undefined>;
    count: import("@kbn/config-schema").Type<number | undefined>;
    byweekday: import("@kbn/config-schema").Type<string[] | undefined>;
    bymonthday: import("@kbn/config-schema").Type<number[] | undefined>;
    bymonth: import("@kbn/config-schema").Type<number[] | undefined>;
}>;
export {};
