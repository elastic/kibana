import { FilterStateStore } from '@kbn/es-query';
import { RuleExecutionStatusErrorReasons, RuleExecutionStatusWarningReasons } from '@kbn/alerting-types';
export * from './v2';
export declare const executionStatusWarningReason: import("@kbn/config-schema").Type<RuleExecutionStatusWarningReasons>;
export declare const executionStatusErrorReason: import("@kbn/config-schema").Type<RuleExecutionStatusErrorReasons>;
export declare const rawRuleExecutionStatusSchema: import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").Type<"error" | "pending" | "active" | "warning" | "unknown" | "ok">;
    lastExecutionDate: import("@kbn/config-schema").Type<string>;
    lastDuration: import("@kbn/config-schema").Type<number | undefined>;
    error: import("@kbn/config-schema").Type<Readonly<{} & {
        message: string;
        reason: RuleExecutionStatusErrorReasons;
    }> | null>;
    warning: import("@kbn/config-schema").Type<Readonly<{} & {
        message: string;
        reason: RuleExecutionStatusWarningReasons;
    }> | null>;
}>;
export declare const ISOWeekdaysSchema: import("@kbn/config-schema").Type<2 | 1 | 3 | 7 | 5 | 4 | 6>;
export declare const rRuleSchema: import("@kbn/config-schema").ObjectType<{
    dtstart: import("@kbn/config-schema").Type<string>;
    tzid: import("@kbn/config-schema").Type<string>;
    freq: import("@kbn/config-schema").Type<0 | 2 | 1 | 3 | 5 | 4 | 6 | undefined>;
    until: import("@kbn/config-schema").Type<string | undefined>;
    count: import("@kbn/config-schema").Type<number | undefined>;
    interval: import("@kbn/config-schema").Type<number | undefined>;
    wkst: import("@kbn/config-schema").Type<"TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU" | undefined>;
    byweekday: import("@kbn/config-schema").Type<(string | number)[] | null | undefined>;
    bymonth: import("@kbn/config-schema").Type<number[] | null | undefined>;
    bysetpos: import("@kbn/config-schema").Type<number[] | null | undefined>;
    bymonthday: import("@kbn/config-schema").Type<number[] | null | undefined>;
    byyearday: import("@kbn/config-schema").Type<number[] | null | undefined>;
    byweekno: import("@kbn/config-schema").Type<number[] | null | undefined>;
    byhour: import("@kbn/config-schema").Type<number[] | null | undefined>;
    byminute: import("@kbn/config-schema").Type<number[] | null | undefined>;
    bysecond: import("@kbn/config-schema").Type<number[] | null | undefined>;
}>;
export declare const outcome: import("@kbn/config-schema").Type<"warning" | "failed" | "succeeded">;
export declare const rawRuleLastRunSchema: import("@kbn/config-schema").ObjectType<{
    outcome: import("@kbn/config-schema").Type<"warning" | "failed" | "succeeded">;
    outcomeOrder: import("@kbn/config-schema").Type<number | undefined>;
    alertsCount: import("@kbn/config-schema").ObjectType<{
        new: import("@kbn/config-schema").Type<number | null | undefined>;
        active: import("@kbn/config-schema").Type<number | null | undefined>;
        recovered: import("@kbn/config-schema").Type<number | null | undefined>;
        ignored: import("@kbn/config-schema").Type<number | null | undefined>;
    }>;
    outcomeMsg: import("@kbn/config-schema").Type<string[] | null | undefined>;
    warning: import("@kbn/config-schema").Type<RuleExecutionStatusErrorReasons | RuleExecutionStatusWarningReasons | null | undefined>;
}>;
export declare const rawRuleMonitoringSchema: import("@kbn/config-schema").ObjectType<{
    run: import("@kbn/config-schema").ObjectType<{
        history: import("@kbn/config-schema").Type<Readonly<{
            duration?: number | undefined;
            outcome?: "warning" | "failed" | "succeeded" | undefined;
        } & {
            success: boolean;
            timestamp: number;
        }>[]>;
        calculated_metrics: import("@kbn/config-schema").ObjectType<{
            p50: import("@kbn/config-schema").Type<number | undefined>;
            p95: import("@kbn/config-schema").Type<number | undefined>;
            p99: import("@kbn/config-schema").Type<number | undefined>;
            success_ratio: import("@kbn/config-schema").Type<number>;
        }>;
        last_run: import("@kbn/config-schema").ObjectType<{
            timestamp: import("@kbn/config-schema").Type<string>;
            metrics: import("@kbn/config-schema").ObjectType<{
                duration: import("@kbn/config-schema").Type<number | undefined>;
                total_search_duration_ms: import("@kbn/config-schema").Type<number | null | undefined>;
                total_indexing_duration_ms: import("@kbn/config-schema").Type<number | null | undefined>;
                total_alerts_detected: import("@kbn/config-schema").Type<number | null | undefined>;
                total_alerts_created: import("@kbn/config-schema").Type<number | null | undefined>;
                gap_duration_s: import("@kbn/config-schema").Type<number | null | undefined>;
            }>;
        }>;
    }>;
}>;
export declare const rawRuleAlertsFilterSchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        filters: Readonly<{
            query?: Record<string, any> | undefined;
            $state?: Readonly<{} & {
                store: FilterStateStore;
            }> | undefined;
        } & {
            meta: Readonly<{
                index?: string | undefined;
                type?: string | undefined;
                params?: any;
                key?: string | undefined;
                value?: string | undefined;
                group?: string | undefined;
                disabled?: boolean | undefined;
                field?: string | undefined;
                alias?: string | null | undefined;
                negate?: boolean | undefined;
                controlledBy?: string | undefined;
                isMultiIndex?: boolean | undefined;
                relation?: "AND" | "OR" | undefined;
            } & {}>;
        }>[];
        kql: string;
        dsl: string;
    }> | undefined>;
    timeframe: import("@kbn/config-schema").Type<Readonly<{} & {
        days: (2 | 1 | 3 | 7 | 5 | 4 | 6)[];
        hours: Readonly<{} & {
            start: string;
            end: string;
        }>;
        timezone: string;
    }> | undefined>;
}>;
export declare const rawRuleActionSchema: import("@kbn/config-schema").ObjectType<{
    uuid: import("@kbn/config-schema").Type<string>;
    group: import("@kbn/config-schema").Type<string | undefined>;
    actionRef: import("@kbn/config-schema").Type<string>;
    actionTypeId: import("@kbn/config-schema").Type<string>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    frequency: import("@kbn/config-schema").Type<Readonly<{} & {
        summary: boolean;
        throttle: string | null;
        notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
    }> | undefined>;
    alertsFilter: import("@kbn/config-schema").Type<Readonly<{
        query?: Readonly<{} & {
            filters: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: FilterStateStore;
                }> | undefined;
            } & {
                meta: Readonly<{
                    index?: string | undefined;
                    type?: string | undefined;
                    params?: any;
                    key?: string | undefined;
                    value?: string | undefined;
                    group?: string | undefined;
                    disabled?: boolean | undefined;
                    field?: string | undefined;
                    alias?: string | null | undefined;
                    negate?: boolean | undefined;
                    controlledBy?: string | undefined;
                    isMultiIndex?: boolean | undefined;
                    relation?: "AND" | "OR" | undefined;
                } & {}>;
            }>[];
            kql: string;
            dsl: string;
        }> | undefined;
        timeframe?: Readonly<{} & {
            days: (2 | 1 | 3 | 7 | 5 | 4 | 6)[];
            hours: Readonly<{} & {
                start: string;
                end: string;
            }>;
            timezone: string;
        }> | undefined;
    } & {}> | undefined>;
    useAlertDataForTemplate: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const alertDelaySchema: import("@kbn/config-schema").ObjectType<{
    active: import("@kbn/config-schema").Type<number>;
}>;
export declare const flappingSchema: import("@kbn/config-schema").ObjectType<{
    lookBackWindow: import("@kbn/config-schema").Type<number>;
    statusChangeThreshold: import("@kbn/config-schema").Type<number>;
}>;
export declare const rawRuleSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    consumer: import("@kbn/config-schema").Type<string>;
    tags: import("@kbn/config-schema").Type<string[]>;
    alertTypeId: import("@kbn/config-schema").Type<string>;
    apiKeyOwner: import("@kbn/config-schema").Type<string | null>;
    apiKey: import("@kbn/config-schema").Type<string | null>;
    apiKeyCreatedByUser: import("@kbn/config-schema").Type<boolean | null | undefined>;
    createdBy: import("@kbn/config-schema").Type<string | null>;
    updatedBy: import("@kbn/config-schema").Type<string | null>;
    updatedAt: import("@kbn/config-schema").Type<string>;
    createdAt: import("@kbn/config-schema").Type<string>;
    muteAll: import("@kbn/config-schema").Type<boolean>;
    mutedInstanceIds: import("@kbn/config-schema").Type<string[]>;
    throttle: import("@kbn/config-schema").Type<string | null | undefined>;
    revision: import("@kbn/config-schema").Type<number>;
    running: import("@kbn/config-schema").Type<boolean | null | undefined>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    legacyId: import("@kbn/config-schema").Type<string | null>;
    scheduledTaskId: import("@kbn/config-schema").Type<string | null | undefined>;
    isSnoozedUntil: import("@kbn/config-schema").Type<string | null | undefined>;
    snoozeSchedule: import("@kbn/config-schema").Type<Readonly<{
        id?: string | undefined;
        skipRecurrences?: string[] | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            until?: string | undefined;
            wkst?: "TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            freq?: 0 | 2 | 1 | 3 | 5 | 4 | 6 | undefined;
            byweekno?: number[] | null | undefined;
        } & {
            dtstart: string;
            tzid: string;
        }>;
    }>[] | undefined>;
    meta: import("@kbn/config-schema").Type<Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined>;
    actions: import("@kbn/config-schema").Type<Readonly<{
        group?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{} & {
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Readonly<{
                        index?: string | undefined;
                        type?: string | undefined;
                        params?: any;
                        key?: string | undefined;
                        value?: string | undefined;
                        group?: string | undefined;
                        disabled?: boolean | undefined;
                        field?: string | undefined;
                        alias?: string | null | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        relation?: "AND" | "OR" | undefined;
                    } & {}>;
                }>[];
                kql: string;
                dsl: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                days: (2 | 1 | 3 | 7 | 5 | 4 | 6)[];
                hours: Readonly<{} & {
                    start: string;
                    end: string;
                }>;
                timezone: string;
            }> | undefined;
        } & {}> | undefined;
        useAlertDataForTemplate?: boolean | undefined;
    } & {
        params: Record<string, any>;
        uuid: string;
        actionRef: string;
        actionTypeId: string;
    }>[]>;
    executionStatus: import("@kbn/config-schema").ObjectType<{
        status: import("@kbn/config-schema").Type<"error" | "pending" | "active" | "warning" | "unknown" | "ok">;
        lastExecutionDate: import("@kbn/config-schema").Type<string>;
        lastDuration: import("@kbn/config-schema").Type<number | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: RuleExecutionStatusErrorReasons;
        }> | null>;
        warning: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: RuleExecutionStatusWarningReasons;
        }> | null>;
    }>;
    notifyWhen: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    monitoring: import("@kbn/config-schema").Type<Readonly<{} & {
        run: Readonly<{} & {
            history: Readonly<{
                duration?: number | undefined;
                outcome?: "warning" | "failed" | "succeeded" | undefined;
            } & {
                success: boolean;
                timestamp: number;
            }>[];
            calculated_metrics: Readonly<{
                p50?: number | undefined;
                p95?: number | undefined;
                p99?: number | undefined;
            } & {
                success_ratio: number;
            }>;
            last_run: Readonly<{} & {
                timestamp: string;
                metrics: Readonly<{
                    duration?: number | undefined;
                    total_search_duration_ms?: number | null | undefined;
                    total_indexing_duration_ms?: number | null | undefined;
                    total_alerts_detected?: number | null | undefined;
                    total_alerts_created?: number | null | undefined;
                    gap_duration_s?: number | null | undefined;
                } & {}>;
            }>;
        }>;
    }> | undefined>;
    lastRun: import("@kbn/config-schema").Type<Readonly<{
        warning?: RuleExecutionStatusErrorReasons | RuleExecutionStatusWarningReasons | null | undefined;
        outcomeOrder?: number | undefined;
        outcomeMsg?: string[] | null | undefined;
    } & {
        outcome: "warning" | "failed" | "succeeded";
        alertsCount: Readonly<{
            active?: number | null | undefined;
            new?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined>;
    nextRun: import("@kbn/config-schema").Type<string | null | undefined>;
    mapped_params: import("@kbn/config-schema").Type<Readonly<{
        severity?: string | undefined;
        risk_score?: number | undefined;
    } & {}> | undefined>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    typeVersion: import("@kbn/config-schema").Type<number | undefined>;
    alertDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    flapping: import("@kbn/config-schema").Type<Readonly<{} & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined>;
}>;
