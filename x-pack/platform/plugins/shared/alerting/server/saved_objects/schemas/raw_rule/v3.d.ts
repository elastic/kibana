import { FilterStateStore } from '@kbn/es-query';
import { RuleExecutionStatusErrorReasons, RuleExecutionStatusWarningReasons } from '@kbn/alerting-types';
export * from './v2';
export declare const executionStatusWarningReason: import("@kbn/config-schema").Type<RuleExecutionStatusWarningReasons>;
export declare const executionStatusErrorReason: import("@kbn/config-schema").Type<RuleExecutionStatusErrorReasons>;
export declare const rawRuleExecutionStatusSchema: import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").Type<"active" | "error" | "ok" | "pending" | "unknown" | "warning">;
    lastExecutionDate: import("@kbn/config-schema").Type<string>;
    lastDuration: import("@kbn/config-schema").Type<number | undefined>;
    error: import("@kbn/config-schema").Type<Readonly<{} & {
        reason: RuleExecutionStatusErrorReasons;
        message: string;
    }> | null>;
    warning: import("@kbn/config-schema").Type<Readonly<{} & {
        reason: RuleExecutionStatusWarningReasons;
        message: string;
    }> | null>;
}>;
export declare const ISOWeekdaysSchema: import("@kbn/config-schema").Type<1 | 2 | 3 | 4 | 5 | 6 | 7>;
export declare const rRuleSchema: import("@kbn/config-schema").ObjectType<{
    dtstart: import("@kbn/config-schema").Type<string>;
    tzid: import("@kbn/config-schema").Type<string>;
    freq: import("@kbn/config-schema").Type<0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined>;
    until: import("@kbn/config-schema").Type<string | undefined>;
    count: import("@kbn/config-schema").Type<number | undefined>;
    interval: import("@kbn/config-schema").Type<number | undefined>;
    wkst: import("@kbn/config-schema").Type<"FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE" | undefined>;
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
export declare const outcome: import("@kbn/config-schema").Type<"failed" | "succeeded" | "warning">;
export declare const rawRuleLastRunSchema: import("@kbn/config-schema").ObjectType<{
    outcome: import("@kbn/config-schema").Type<"failed" | "succeeded" | "warning">;
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
            outcome?: "failed" | "succeeded" | "warning" | undefined;
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
        kql: string;
        filters: Readonly<{
            query?: Record<string, any> | undefined;
            $state?: Readonly<{} & {
                store: FilterStateStore;
            }> | undefined;
        } & {
            meta: Readonly<{
                alias?: string | null | undefined;
                disabled?: boolean | undefined;
                negate?: boolean | undefined;
                controlledBy?: string | undefined;
                group?: string | undefined;
                index?: string | undefined;
                isMultiIndex?: boolean | undefined;
                type?: string | undefined;
                key?: string | undefined;
                params?: any;
                value?: string | undefined;
                field?: string | undefined;
                relation?: "AND" | "OR" | undefined;
            } & {}>;
        }>[];
        dsl: string;
    }> | undefined>;
    timeframe: import("@kbn/config-schema").Type<Readonly<{} & {
        days: (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
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
        notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        throttle: string | null;
    }> | undefined>;
    alertsFilter: import("@kbn/config-schema").Type<Readonly<{
        query?: Readonly<{} & {
            kql: string;
            filters: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: FilterStateStore;
                }> | undefined;
            } & {
                meta: Readonly<{
                    alias?: string | null | undefined;
                    disabled?: boolean | undefined;
                    negate?: boolean | undefined;
                    controlledBy?: string | undefined;
                    group?: string | undefined;
                    index?: string | undefined;
                    isMultiIndex?: boolean | undefined;
                    type?: string | undefined;
                    key?: string | undefined;
                    params?: any;
                    value?: string | undefined;
                    field?: string | undefined;
                    relation?: "AND" | "OR" | undefined;
                } & {}>;
            }>[];
            dsl: string;
        }> | undefined;
        timeframe?: Readonly<{} & {
            days: (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
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
            freq?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
            until?: string | undefined;
            count?: number | undefined;
            interval?: number | undefined;
            wkst?: "FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE" | undefined;
            byweekday?: (string | number)[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byyearday?: number[] | null | undefined;
            byweekno?: number[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
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
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
            throttle: string | null;
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{} & {
                kql: string;
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Readonly<{
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        index?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        type?: string | undefined;
                        key?: string | undefined;
                        params?: any;
                        value?: string | undefined;
                        field?: string | undefined;
                        relation?: "AND" | "OR" | undefined;
                    } & {}>;
                }>[];
                dsl: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                days: (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
                hours: Readonly<{} & {
                    start: string;
                    end: string;
                }>;
                timezone: string;
            }> | undefined;
        } & {}> | undefined;
        useAlertDataForTemplate?: boolean | undefined;
    } & {
        uuid: string;
        actionRef: string;
        actionTypeId: string;
        params: Record<string, any>;
    }>[]>;
    executionStatus: import("@kbn/config-schema").ObjectType<{
        status: import("@kbn/config-schema").Type<"active" | "error" | "ok" | "pending" | "unknown" | "warning">;
        lastExecutionDate: import("@kbn/config-schema").Type<string>;
        lastDuration: import("@kbn/config-schema").Type<number | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            reason: RuleExecutionStatusErrorReasons;
            message: string;
        }> | null>;
        warning: import("@kbn/config-schema").Type<Readonly<{} & {
            reason: RuleExecutionStatusWarningReasons;
            message: string;
        }> | null>;
    }>;
    notifyWhen: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    monitoring: import("@kbn/config-schema").Type<Readonly<{} & {
        run: Readonly<{} & {
            history: Readonly<{
                duration?: number | undefined;
                outcome?: "failed" | "succeeded" | "warning" | undefined;
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
        outcomeOrder?: number | undefined;
        outcomeMsg?: string[] | null | undefined;
        warning?: RuleExecutionStatusErrorReasons | RuleExecutionStatusWarningReasons | null | undefined;
    } & {
        outcome: "failed" | "succeeded" | "warning";
        alertsCount: Readonly<{
            new?: number | null | undefined;
            active?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined>;
    nextRun: import("@kbn/config-schema").Type<string | null | undefined>;
    mapped_params: import("@kbn/config-schema").Type<Readonly<{
        risk_score?: number | undefined;
        severity?: string | undefined;
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
