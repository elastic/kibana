export declare const mappedParamsSchema: import("@kbn/config-schema").Type<Record<string, any>>;
export declare const intervalScheduleSchema: import("@kbn/config-schema").ObjectType<{
    interval: import("@kbn/config-schema").Type<string>;
}>;
export declare const ruleExecutionStatusSchema: import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").Type<"error" | "pending" | "active" | "warning" | "unknown" | "ok">;
    lastExecutionDate: import("@kbn/config-schema").AnyType;
    lastDuration: import("@kbn/config-schema").Type<number | undefined>;
    error: import("@kbn/config-schema").Type<Readonly<{} & {
        message: string;
        reason: "license" | "timeout" | "unknown" | "validate" | "read" | "disabled" | "execute" | "decrypt";
    }> | undefined>;
    warning: import("@kbn/config-schema").Type<Readonly<{} & {
        message: string;
        reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
    }> | undefined>;
}>;
export declare const ruleLastRunSchema: import("@kbn/config-schema").ObjectType<{
    outcome: import("@kbn/config-schema").Type<"warning" | "failed" | "succeeded">;
    outcomeOrder: import("@kbn/config-schema").Type<number | undefined>;
    warning: import("@kbn/config-schema").Type<"license" | "timeout" | "unknown" | "validate" | "read" | "disabled" | "execute" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined>;
    outcomeMsg: import("@kbn/config-schema").Type<string[] | null | undefined>;
    alertsCount: import("@kbn/config-schema").ObjectType<{
        active: import("@kbn/config-schema").Type<number | null | undefined>;
        new: import("@kbn/config-schema").Type<number | null | undefined>;
        recovered: import("@kbn/config-schema").Type<number | null | undefined>;
        ignored: import("@kbn/config-schema").Type<number | null | undefined>;
    }>;
}>;
export declare const monitoringSchema: import("@kbn/config-schema").ObjectType<{
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
                gap_range: import("@kbn/config-schema").Type<Readonly<{} & {
                    gte: string;
                    lte: string;
                }> | null | undefined>;
                gap_reason: import("@kbn/config-schema").Type<Readonly<{} & {
                    type: string;
                }> | null | undefined>;
            }>;
        }>;
    }>;
}>;
export declare const snoozeScheduleSchema: import("@kbn/config-schema").ObjectType<{
    duration: import("@kbn/config-schema").Type<number>;
    rRule: import("@kbn/config-schema").ObjectType<{
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
    id: import("@kbn/config-schema").Type<string | undefined>;
    skipRecurrences: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const snoozedInstanceConditionSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: "field_change";
    field: string;
}> | Readonly<{} & {
    type: "severity_change";
}> | Readonly<{} & {
    type: "severity_equals";
    value: "info" | "critical" | "medium" | "high" | "low";
}>>;
export declare const snoozedInstanceSchema: import("@kbn/config-schema").ObjectType<{
    instanceId: import("@kbn/config-schema").Type<string>;
    expiresAt: import("@kbn/config-schema").Type<string | undefined>;
    conditions: import("@kbn/config-schema").Type<(Readonly<{} & {
        type: "field_change";
        field: string;
    }> | Readonly<{} & {
        type: "severity_change";
    }> | Readonly<{} & {
        type: "severity_equals";
        value: "info" | "critical" | "medium" | "high" | "low";
    }>)[] | undefined>;
    conditionOperator: import("@kbn/config-schema").Type<"all" | "any" | undefined>;
    snoozeSnapshot: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    snoozedAt: import("@kbn/config-schema").Type<string>;
    snoozedBy: import("@kbn/config-schema").Type<string>;
}>;
export declare const alertDelaySchema: import("@kbn/config-schema").ObjectType<{
    active: import("@kbn/config-schema").Type<number>;
}>;
/**
 * Unsanitized (domain) rule schema, used by internal rules clients
 */
export declare const ruleDomainSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    name: import("@kbn/config-schema").Type<string>;
    tags: import("@kbn/config-schema").Type<string[]>;
    alertTypeId: import("@kbn/config-schema").Type<string>;
    consumer: import("@kbn/config-schema").Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    actions: import("@kbn/config-schema").Type<Readonly<{
        uuid?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{
                dsl?: string | undefined;
            } & {
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: import("@kbn/es-query-constants").FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Record<string, any>;
                }>[];
                kql: string;
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
        id: string;
        params: Record<string, any>;
        group: string;
        actionTypeId: string;
    }>[]>;
    systemActions: import("@kbn/config-schema").Type<Readonly<{
        uuid?: string | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        actionTypeId: string;
    }>[] | undefined>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    mapped_params: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    scheduledTaskId: import("@kbn/config-schema").Type<string | undefined>;
    createdBy: import("@kbn/config-schema").Type<string | null>;
    updatedBy: import("@kbn/config-schema").Type<string | null>;
    createdAt: import("@kbn/config-schema").AnyType;
    updatedAt: import("@kbn/config-schema").AnyType;
    apiKey: import("@kbn/config-schema").Type<string | null>;
    apiKeyOwner: import("@kbn/config-schema").Type<string | null>;
    apiKeyCreatedByUser: import("@kbn/config-schema").Type<boolean | null | undefined>;
    uiamApiKey: import("@kbn/config-schema").Type<string | null | undefined>;
    throttle: import("@kbn/config-schema").Type<string | null | undefined>;
    muteAll: import("@kbn/config-schema").Type<boolean>;
    notifyWhen: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    mutedInstanceIds: import("@kbn/config-schema").Type<string[]>;
    snoozedInstances: import("@kbn/config-schema").Type<Readonly<{
        snoozeSnapshot?: Record<string, any> | undefined;
        expiresAt?: string | undefined;
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            type: "severity_equals";
            value: "info" | "critical" | "medium" | "high" | "low";
        }>)[] | undefined;
        conditionOperator?: "all" | "any" | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined>;
    executionStatus: import("@kbn/config-schema").ObjectType<{
        status: import("@kbn/config-schema").Type<"error" | "pending" | "active" | "warning" | "unknown" | "ok">;
        lastExecutionDate: import("@kbn/config-schema").AnyType;
        lastDuration: import("@kbn/config-schema").Type<number | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "license" | "timeout" | "unknown" | "validate" | "read" | "disabled" | "execute" | "decrypt";
        }> | undefined>;
        warning: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
        }> | undefined>;
    }>;
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
                    gap_range?: Readonly<{} & {
                        gte: string;
                        lte: string;
                    }> | null | undefined;
                    gap_reason?: Readonly<{} & {
                        type: string;
                    }> | null | undefined;
                } & {}>;
            }>;
        }>;
    }> | undefined>;
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
    activeSnoozes: import("@kbn/config-schema").Type<string[] | undefined>;
    isSnoozedUntil: import("@kbn/config-schema").Type<any>;
    lastRun: import("@kbn/config-schema").Type<Readonly<{
        warning?: "license" | "timeout" | "unknown" | "validate" | "read" | "disabled" | "execute" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined;
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
    nextRun: import("@kbn/config-schema").Type<any>;
    revision: import("@kbn/config-schema").Type<number>;
    running: import("@kbn/config-schema").Type<boolean | null | undefined>;
    viewInAppRelativeUrl: import("@kbn/config-schema").Type<string | null | undefined>;
    alertDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    lastEnabledAt: import("@kbn/config-schema").Type<any>;
    legacyId: import("@kbn/config-schema").Type<string | null | undefined>;
    flapping: import("@kbn/config-schema").Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined>;
    artifacts: import("@kbn/config-schema").Type<Readonly<{
        dashboards?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined>;
}>;
/**
 * Sanitized (non-domain) rule schema, returned by rules clients for other solutions
 */
export declare const ruleSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    name: import("@kbn/config-schema").Type<string>;
    tags: import("@kbn/config-schema").Type<string[]>;
    alertTypeId: import("@kbn/config-schema").Type<string>;
    consumer: import("@kbn/config-schema").Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: import("@kbn/config-schema").Type<string>;
    }>;
    actions: import("@kbn/config-schema").Type<Readonly<{
        uuid?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{
                dsl?: string | undefined;
            } & {
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: import("@kbn/es-query-constants").FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Record<string, any>;
                }>[];
                kql: string;
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
        id: string;
        params: Record<string, any>;
        group: string;
        actionTypeId: string;
    }>[]>;
    systemActions: import("@kbn/config-schema").Type<Readonly<{
        uuid?: string | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        actionTypeId: string;
    }>[] | undefined>;
    params: import("@kbn/config-schema").Type<Record<string, any>>;
    mapped_params: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    scheduledTaskId: import("@kbn/config-schema").Type<string | undefined>;
    createdBy: import("@kbn/config-schema").Type<string | null>;
    updatedBy: import("@kbn/config-schema").Type<string | null>;
    createdAt: import("@kbn/config-schema").AnyType;
    updatedAt: import("@kbn/config-schema").AnyType;
    apiKeyOwner: import("@kbn/config-schema").Type<string | null>;
    apiKeyCreatedByUser: import("@kbn/config-schema").Type<boolean | null | undefined>;
    throttle: import("@kbn/config-schema").Type<string | null | undefined>;
    muteAll: import("@kbn/config-schema").Type<boolean>;
    notifyWhen: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    mutedInstanceIds: import("@kbn/config-schema").Type<string[]>;
    snoozedInstances: import("@kbn/config-schema").Type<Readonly<{
        snoozeSnapshot?: Record<string, any> | undefined;
        expiresAt?: string | undefined;
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            type: "severity_equals";
            value: "info" | "critical" | "medium" | "high" | "low";
        }>)[] | undefined;
        conditionOperator?: "all" | "any" | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined>;
    executionStatus: import("@kbn/config-schema").ObjectType<{
        status: import("@kbn/config-schema").Type<"error" | "pending" | "active" | "warning" | "unknown" | "ok">;
        lastExecutionDate: import("@kbn/config-schema").AnyType;
        lastDuration: import("@kbn/config-schema").Type<number | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "license" | "timeout" | "unknown" | "validate" | "read" | "disabled" | "execute" | "decrypt";
        }> | undefined>;
        warning: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
        }> | undefined>;
    }>;
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
                    gap_range?: Readonly<{} & {
                        gte: string;
                        lte: string;
                    }> | null | undefined;
                    gap_reason?: Readonly<{} & {
                        type: string;
                    }> | null | undefined;
                } & {}>;
            }>;
        }>;
    }> | undefined>;
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
    activeSnoozes: import("@kbn/config-schema").Type<string[] | undefined>;
    isSnoozedUntil: import("@kbn/config-schema").Type<any>;
    lastRun: import("@kbn/config-schema").Type<Readonly<{
        warning?: "license" | "timeout" | "unknown" | "validate" | "read" | "disabled" | "execute" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined;
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
    nextRun: import("@kbn/config-schema").Type<any>;
    revision: import("@kbn/config-schema").Type<number>;
    running: import("@kbn/config-schema").Type<boolean | null | undefined>;
    viewInAppRelativeUrl: import("@kbn/config-schema").Type<string | null | undefined>;
    alertDelay: import("@kbn/config-schema").Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    lastEnabledAt: import("@kbn/config-schema").Type<any>;
    legacyId: import("@kbn/config-schema").Type<string | null | undefined>;
    flapping: import("@kbn/config-schema").Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined>;
    artifacts: import("@kbn/config-schema").Type<Readonly<{
        dashboards?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined>;
}>;
