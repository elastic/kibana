import type { Type } from '@kbn/config-schema';
import { type AlertSeverity } from '@kbn/rule-data-utils';
export declare const mappedParamsSchema: Type<Record<string, any>>;
export declare const intervalScheduleSchema: import("@kbn/config-schema").ObjectType<{
    interval: Type<string>;
}>;
export declare const ruleExecutionStatusSchema: import("@kbn/config-schema").ObjectType<{
    status: Type<"active" | "error" | "ok" | "pending" | "unknown" | "warning">;
    lastExecutionDate: import("@kbn/config-schema").AnyType;
    lastDuration: Type<number | undefined>;
    error: Type<Readonly<{} & {
        reason: "decrypt" | "disabled" | "execute" | "license" | "read" | "timeout" | "unknown" | "validate";
        message: string;
    }> | undefined>;
    warning: Type<Readonly<{} & {
        reason: "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "ruleExecution";
        message: string;
    }> | undefined>;
}>;
export declare const ruleLastRunSchema: import("@kbn/config-schema").ObjectType<{
    outcome: Type<"failed" | "succeeded" | "warning">;
    outcomeOrder: Type<number | undefined>;
    warning: Type<"decrypt" | "disabled" | "execute" | "license" | "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "read" | "ruleExecution" | "timeout" | "unknown" | "validate" | null | undefined>;
    outcomeMsg: Type<string[] | null | undefined>;
    alertsCount: import("@kbn/config-schema").ObjectType<{
        active: Type<number | null | undefined>;
        new: Type<number | null | undefined>;
        recovered: Type<number | null | undefined>;
        ignored: Type<number | null | undefined>;
    }>;
}>;
export declare const monitoringSchema: import("@kbn/config-schema").ObjectType<{
    run: import("@kbn/config-schema").ObjectType<{
        history: Type<Readonly<{
            duration?: number | undefined;
            outcome?: "failed" | "succeeded" | "warning" | undefined;
        } & {
            success: boolean;
            timestamp: number;
        }>[]>;
        calculated_metrics: import("@kbn/config-schema").ObjectType<{
            p50: Type<number | undefined>;
            p95: Type<number | undefined>;
            p99: Type<number | undefined>;
            success_ratio: Type<number>;
        }>;
        last_run: import("@kbn/config-schema").ObjectType<{
            timestamp: Type<string>;
            metrics: import("@kbn/config-schema").ObjectType<{
                duration: Type<number | undefined>;
                total_search_duration_ms: Type<number | null | undefined>;
                total_indexing_duration_ms: Type<number | null | undefined>;
                total_alerts_detected: Type<number | null | undefined>;
                total_alerts_created: Type<number | null | undefined>;
                gap_duration_s: Type<number | null | undefined>;
                gap_range: Type<Readonly<{} & {
                    gte: string;
                    lte: string;
                }> | null | undefined>;
                gap_reason: Type<Readonly<{} & {
                    type: string;
                }> | null | undefined>;
            }>;
        }>;
    }>;
}>;
export declare const snoozeScheduleSchema: import("@kbn/config-schema").ObjectType<{
    duration: Type<number>;
    rRule: import("@kbn/config-schema").ObjectType<{
        dtstart: Type<string>;
        tzid: Type<string>;
        freq: Type<0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined>;
        until: Type<string | undefined>;
        count: Type<number | undefined>;
        interval: Type<number | undefined>;
        wkst: Type<"FR" | "MO" | "SA" | "SU" | "TH" | "TU" | "WE" | undefined>;
        byweekday: Type<(string | number)[] | null | undefined>;
        bymonth: Type<number[] | null | undefined>;
        bysetpos: Type<number[] | null | undefined>;
        bymonthday: Type<number[] | null | undefined>;
        byyearday: Type<number[] | null | undefined>;
        byweekno: Type<number[] | null | undefined>;
        byhour: Type<number[] | null | undefined>;
        byminute: Type<number[] | null | undefined>;
        bysecond: Type<number[] | null | undefined>;
    }>;
    id: Type<string | undefined>;
    skipRecurrences: Type<string[] | undefined>;
}>;
export declare const snoozedInstanceConditionSchema: Type<Readonly<{} & {
    type: "field_change";
    field: string;
}> | Readonly<{} & {
    type: "severity_change";
}> | Readonly<{} & {
    type: "severity_equals";
    value: AlertSeverity;
}>>;
export declare const snoozedInstanceSchema: import("@kbn/config-schema").ObjectType<{
    instanceId: Type<string>;
    expiresAt: Type<string | undefined>;
    conditions: Type<(Readonly<{} & {
        type: "field_change";
        field: string;
    }> | Readonly<{} & {
        type: "severity_change";
    }> | Readonly<{} & {
        type: "severity_equals";
        value: AlertSeverity;
    }>)[] | undefined>;
    conditionOperator: Type<"all" | "any" | undefined>;
    snoozeSnapshot: Type<Record<string, any> | undefined>;
    snoozedAt: Type<string>;
    snoozedBy: Type<string>;
}>;
export declare const alertDelaySchema: import("@kbn/config-schema").ObjectType<{
    active: Type<number>;
}>;
/**
 * Unsanitized (domain) rule schema, used by internal rules clients
 */
export declare const ruleDomainSchema: import("@kbn/config-schema").ObjectType<{
    id: Type<string>;
    enabled: Type<boolean>;
    name: Type<string>;
    tags: Type<string[]>;
    alertTypeId: Type<string>;
    consumer: Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: Type<string>;
    }>;
    actions: Type<Readonly<{
        uuid?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
            throttle: string | null;
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{
                dsl?: string | undefined;
            } & {
                kql: string;
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: import("@kbn/es-query-constants").FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Record<string, any>;
                }>[];
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
        group: string;
        id: string;
        actionTypeId: string;
        params: Record<string, any>;
    }>[]>;
    systemActions: Type<Readonly<{
        uuid?: string | undefined;
    } & {
        id: string;
        actionTypeId: string;
        params: Record<string, any>;
    }>[] | undefined>;
    params: Type<Record<string, any>>;
    mapped_params: Type<Record<string, any> | undefined>;
    scheduledTaskId: Type<string | undefined>;
    createdBy: Type<string | null>;
    updatedBy: Type<string | null>;
    createdByProfileUid: Type<string | null | undefined>;
    updatedByProfileUid: Type<string | null | undefined>;
    createdAt: import("@kbn/config-schema").AnyType;
    updatedAt: import("@kbn/config-schema").AnyType;
    apiKey: Type<string | null>;
    apiKeyOwner: Type<string | null>;
    apiKeyOwnerProfileUid: Type<string | null | undefined>;
    apiKeyCreatedByUser: Type<boolean | null | undefined>;
    uiamApiKey: Type<string | null | undefined>;
    uiamApiKeyExternal: Type<boolean | null | undefined>;
    throttle: Type<string | null | undefined>;
    muteAll: Type<boolean>;
    notifyWhen: Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    mutedInstanceIds: Type<string[]>;
    snoozedInstances: Type<Readonly<{
        expiresAt?: string | undefined;
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            type: "severity_equals";
            value: AlertSeverity;
        }>)[] | undefined;
        conditionOperator?: "all" | "any" | undefined;
        snoozeSnapshot?: Record<string, any> | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined>;
    executionStatus: import("@kbn/config-schema").ObjectType<{
        status: Type<"active" | "error" | "ok" | "pending" | "unknown" | "warning">;
        lastExecutionDate: import("@kbn/config-schema").AnyType;
        lastDuration: Type<number | undefined>;
        error: Type<Readonly<{} & {
            reason: "decrypt" | "disabled" | "execute" | "license" | "read" | "timeout" | "unknown" | "validate";
            message: string;
        }> | undefined>;
        warning: Type<Readonly<{} & {
            reason: "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "ruleExecution";
            message: string;
        }> | undefined>;
    }>;
    monitoring: Type<Readonly<{} & {
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
    snoozeSchedule: Type<Readonly<{
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
    activeSnoozes: Type<string[] | undefined>;
    isSnoozedUntil: Type<any>;
    lastRun: Type<Readonly<{
        outcomeOrder?: number | undefined;
        warning?: "decrypt" | "disabled" | "execute" | "license" | "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "read" | "ruleExecution" | "timeout" | "unknown" | "validate" | null | undefined;
        outcomeMsg?: string[] | null | undefined;
    } & {
        outcome: "failed" | "succeeded" | "warning";
        alertsCount: Readonly<{
            active?: number | null | undefined;
            new?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined>;
    nextRun: Type<any>;
    revision: Type<number>;
    running: Type<boolean | null | undefined>;
    viewInAppRelativeUrl: Type<string | null | undefined>;
    alertDelay: Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    lastEnabledAt: Type<any>;
    legacyId: Type<string | null | undefined>;
    flapping: Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined>;
    artifacts: Type<Readonly<{
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
    id: Type<string>;
    enabled: Type<boolean>;
    name: Type<string>;
    tags: Type<string[]>;
    alertTypeId: Type<string>;
    consumer: Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: Type<string>;
    }>;
    actions: Type<Readonly<{
        uuid?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
            throttle: string | null;
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{
                dsl?: string | undefined;
            } & {
                kql: string;
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: import("@kbn/es-query-constants").FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Record<string, any>;
                }>[];
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
        group: string;
        id: string;
        actionTypeId: string;
        params: Record<string, any>;
    }>[]>;
    systemActions: Type<Readonly<{
        uuid?: string | undefined;
    } & {
        id: string;
        actionTypeId: string;
        params: Record<string, any>;
    }>[] | undefined>;
    params: Type<Record<string, any>>;
    mapped_params: Type<Record<string, any> | undefined>;
    scheduledTaskId: Type<string | undefined>;
    createdBy: Type<string | null>;
    updatedBy: Type<string | null>;
    createdByProfileUid: Type<string | null | undefined>;
    updatedByProfileUid: Type<string | null | undefined>;
    createdAt: import("@kbn/config-schema").AnyType;
    updatedAt: import("@kbn/config-schema").AnyType;
    apiKeyOwner: Type<string | null>;
    apiKeyOwnerProfileUid: Type<string | null | undefined>;
    apiKeyCreatedByUser: Type<boolean | null | undefined>;
    throttle: Type<string | null | undefined>;
    muteAll: Type<boolean>;
    notifyWhen: Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    mutedInstanceIds: Type<string[]>;
    snoozedInstances: Type<Readonly<{
        expiresAt?: string | undefined;
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            type: "severity_equals";
            value: AlertSeverity;
        }>)[] | undefined;
        conditionOperator?: "all" | "any" | undefined;
        snoozeSnapshot?: Record<string, any> | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined>;
    executionStatus: import("@kbn/config-schema").ObjectType<{
        status: Type<"active" | "error" | "ok" | "pending" | "unknown" | "warning">;
        lastExecutionDate: import("@kbn/config-schema").AnyType;
        lastDuration: Type<number | undefined>;
        error: Type<Readonly<{} & {
            reason: "decrypt" | "disabled" | "execute" | "license" | "read" | "timeout" | "unknown" | "validate";
            message: string;
        }> | undefined>;
        warning: Type<Readonly<{} & {
            reason: "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "ruleExecution";
            message: string;
        }> | undefined>;
    }>;
    monitoring: Type<Readonly<{} & {
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
    snoozeSchedule: Type<Readonly<{
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
    activeSnoozes: Type<string[] | undefined>;
    isSnoozedUntil: Type<any>;
    lastRun: Type<Readonly<{
        outcomeOrder?: number | undefined;
        warning?: "decrypt" | "disabled" | "execute" | "license" | "maxAlerts" | "maxExecutableActions" | "maxQueuedActions" | "read" | "ruleExecution" | "timeout" | "unknown" | "validate" | null | undefined;
        outcomeMsg?: string[] | null | undefined;
    } & {
        outcome: "failed" | "succeeded" | "warning";
        alertsCount: Readonly<{
            active?: number | null | undefined;
            new?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined>;
    nextRun: Type<any>;
    revision: Type<number>;
    running: Type<boolean | null | undefined>;
    viewInAppRelativeUrl: Type<string | null | undefined>;
    alertDelay: Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    lastEnabledAt: Type<any>;
    legacyId: Type<string | null | undefined>;
    flapping: Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined>;
    artifacts: Type<Readonly<{
        dashboards?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined>;
}>;
