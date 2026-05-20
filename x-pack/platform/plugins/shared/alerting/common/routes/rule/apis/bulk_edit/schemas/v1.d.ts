export declare const scheduleIdsSchema: import("@kbn/config-schema").Type<string[] | undefined>;
export declare const ruleSnoozeScheduleSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    duration: import("@kbn/config-schema").Type<number>;
    rRule: import("@kbn/config-schema").ObjectType<{
        dtstart: import("@kbn/config-schema").Type<string>;
        tzid: import("@kbn/config-schema").Type<string>;
        freq: import("@kbn/config-schema").Type<0 | 2 | 1 | 4 | 3 | undefined>;
        interval: import("@kbn/config-schema").Type<number | undefined>;
        until: import("@kbn/config-schema").Type<string | undefined>;
        count: import("@kbn/config-schema").Type<number | undefined>;
        byweekday: import("@kbn/config-schema").Type<string[] | undefined>;
        bymonthday: import("@kbn/config-schema").Type<number[] | undefined>;
        bymonth: import("@kbn/config-schema").Type<number[] | undefined>;
    }>;
}>;
export declare const bulkEditOperationsSchema: import("@kbn/config-schema").Type<(Readonly<{} & {
    field: "tags";
    value: string[];
    operation: "add" | "set" | "delete";
}> | Readonly<{} & {
    field: "actions";
    value: Readonly<{
        group?: string | undefined;
        uuid?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        }> | undefined;
    } & {
        id: string;
        params: Record<string, any>;
    }>[];
    operation: "add" | "set";
}> | Readonly<{} & {
    field: "schedule";
    value: Readonly<{} & {
        interval: string;
    }>;
    operation: "set";
}> | Readonly<{} & {
    field: "throttle";
    value: string | null;
    operation: "set";
}> | Readonly<{} & {
    field: "notifyWhen";
    value: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
    operation: "set";
}> | Readonly<{} & {
    field: "snoozeSchedule";
    value: Readonly<{
        id?: string | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            bymonth?: number[] | undefined;
            bymonthday?: number[] | undefined;
            byweekday?: string[] | undefined;
            freq?: 0 | 2 | 1 | 4 | 3 | undefined;
            until?: string | undefined;
        } & {
            dtstart: string;
            tzid: string;
        }>;
    }>;
    operation: "set";
}> | Readonly<{
    value?: string[] | undefined;
} & {
    field: "snoozeSchedule";
    operation: "delete";
}> | Readonly<{} & {
    field: "apiKey";
    operation: "set";
}>)[]>;
export declare const bulkEditRulesRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    filter: import("@kbn/config-schema").Type<string | undefined>;
    ids: import("@kbn/config-schema").Type<string[] | undefined>;
    operations: import("@kbn/config-schema").Type<(Readonly<{} & {
        field: "tags";
        value: string[];
        operation: "add" | "set" | "delete";
    }> | Readonly<{} & {
        field: "actions";
        value: Readonly<{
            group?: string | undefined;
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                throttle: string | null;
                notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
            }> | undefined;
        } & {
            id: string;
            params: Record<string, any>;
        }>[];
        operation: "add" | "set";
    }> | Readonly<{} & {
        field: "schedule";
        value: Readonly<{} & {
            interval: string;
        }>;
        operation: "set";
    }> | Readonly<{} & {
        field: "throttle";
        value: string | null;
        operation: "set";
    }> | Readonly<{} & {
        field: "notifyWhen";
        value: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        operation: "set";
    }> | Readonly<{} & {
        field: "snoozeSchedule";
        value: Readonly<{
            id?: string | undefined;
        } & {
            duration: number;
            rRule: Readonly<{
                count?: number | undefined;
                interval?: number | undefined;
                bymonth?: number[] | undefined;
                bymonthday?: number[] | undefined;
                byweekday?: string[] | undefined;
                freq?: 0 | 2 | 1 | 4 | 3 | undefined;
                until?: string | undefined;
            } & {
                dtstart: string;
                tzid: string;
            }>;
        }>;
        operation: "set";
    }> | Readonly<{
        value?: string[] | undefined;
    } & {
        field: "snoozeSchedule";
        operation: "delete";
    }> | Readonly<{} & {
        field: "apiKey";
        operation: "set";
    }>)[]>;
}>;
