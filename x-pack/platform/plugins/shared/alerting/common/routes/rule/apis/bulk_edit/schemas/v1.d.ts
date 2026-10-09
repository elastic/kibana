export declare const scheduleIdsSchema: import("@kbn/config-schema").Type<string[] | undefined>;
export declare const ruleSnoozeScheduleSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    duration: import("@kbn/config-schema").Type<number>;
    rRule: import("@kbn/config-schema").ObjectType<{
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
}>;
export declare const bulkEditOperationsSchema: import("@kbn/config-schema").Type<(Readonly<{} & {
    operation: "add" | "delete" | "set";
    field: "tags";
    value: string[];
}> | Readonly<{} & {
    operation: "add" | "set";
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
}> | Readonly<{} & {
    operation: "set";
    field: "schedule";
    value: Readonly<{} & {
        interval: string;
    }>;
}> | Readonly<{} & {
    operation: "set";
    field: "throttle";
    value: string | null;
}> | Readonly<{} & {
    operation: "set";
    field: "notifyWhen";
    value: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
}> | Readonly<{} & {
    operation: "set";
    field: "snoozeSchedule";
    value: Readonly<{
        id?: string | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            freq?: 0 | 1 | 2 | 3 | 4 | undefined;
            interval?: number | undefined;
            until?: string | undefined;
            count?: number | undefined;
            byweekday?: string[] | undefined;
            bymonthday?: number[] | undefined;
            bymonth?: number[] | undefined;
        } & {
            dtstart: string;
            tzid: string;
        }>;
    }>;
}> | Readonly<{
    value?: string[] | undefined;
} & {
    operation: "delete";
    field: "snoozeSchedule";
}> | Readonly<{} & {
    operation: "set";
    field: "apiKey";
}>)[]>;
export declare const bulkEditRulesRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    filter: import("@kbn/config-schema").Type<string | undefined>;
    ids: import("@kbn/config-schema").Type<string[] | undefined>;
    operations: import("@kbn/config-schema").Type<(Readonly<{} & {
        operation: "add" | "delete" | "set";
        field: "tags";
        value: string[];
    }> | Readonly<{} & {
        operation: "add" | "set";
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
    }> | Readonly<{} & {
        operation: "set";
        field: "schedule";
        value: Readonly<{} & {
            interval: string;
        }>;
    }> | Readonly<{} & {
        operation: "set";
        field: "throttle";
        value: string | null;
    }> | Readonly<{} & {
        operation: "set";
        field: "notifyWhen";
        value: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
    }> | Readonly<{} & {
        operation: "set";
        field: "snoozeSchedule";
        value: Readonly<{
            id?: string | undefined;
        } & {
            duration: number;
            rRule: Readonly<{
                freq?: 0 | 1 | 2 | 3 | 4 | undefined;
                interval?: number | undefined;
                until?: string | undefined;
                count?: number | undefined;
                byweekday?: string[] | undefined;
                bymonthday?: number[] | undefined;
                bymonth?: number[] | undefined;
            } & {
                dtstart: string;
                tzid: string;
            }>;
        }>;
    }> | Readonly<{
        value?: string[] | undefined;
    } & {
        operation: "delete";
        field: "snoozeSchedule";
    }> | Readonly<{} & {
        operation: "set";
        field: "apiKey";
    }>)[]>;
}>;
