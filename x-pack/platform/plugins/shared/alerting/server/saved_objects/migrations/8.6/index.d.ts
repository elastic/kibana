import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const getMigrations860: (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => (doc: SavedObjectUnsanitizedDoc<{
    meta?: Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined;
    artifacts?: Readonly<{
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
        dashboards?: Readonly<{} & {
            refId: string;
        }>[] | undefined;
    } & {}> | undefined;
    mapped_params?: Readonly<{
        severity?: string | undefined;
        risk_score?: number | undefined;
    } & {}> | undefined;
    scheduledTaskId?: string | null | undefined;
    uiamApiKey?: string | null | undefined;
    throttle?: string | null | undefined;
    notifyWhen?: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange" | null | undefined;
    snoozedInstances?: Readonly<{
        snoozeSnapshot?: Record<string, any> | undefined;
        expiresAt?: string | undefined;
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            type: "severity_equals";
            value: "low" | "medium" | "high" | "info" | "critical";
        }>)[] | undefined;
        conditionOperator?: "all" | "any" | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined;
    monitoring?: Readonly<{} & {
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
    }> | undefined;
    snoozeSchedule?: Readonly<{
        id?: string | undefined;
        skipRecurrences?: string[] | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            freq?: 0 | 2 | 1 | 4 | 5 | 3 | 6 | undefined;
            until?: string | undefined;
            wkst?: "TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU" | undefined;
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
    }>[] | undefined;
    lastRun?: Readonly<{
        warning?: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons | import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons | null | undefined;
        outcomeOrder?: number | undefined;
        outcomeMsg?: string[] | null | undefined;
    } & {
        outcome: "warning" | "failed" | "succeeded";
        alertsCount: Readonly<{
            new?: number | null | undefined;
            active?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined;
    running?: boolean | null | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    apiKeyCreatedByUser?: boolean | null | undefined;
    isSnoozedUntil?: string | null | undefined;
    nextRun?: string | null | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    lastEnabledAt?: string | undefined;
    typeVersion?: number | undefined;
    name: string;
    enabled: boolean;
    actions: {
        group?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notifyWhen: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange";
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{} & {
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: import("@kbn/es-query-constants").FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Readonly<{
                        type?: string | undefined;
                        index?: string | undefined;
                        key?: string | undefined;
                        value?: string | undefined;
                        disabled?: boolean | undefined;
                        group?: string | undefined;
                        field?: string | undefined;
                        params?: any;
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
                timezone: string;
                days: (2 | 1 | 4 | 5 | 3 | 6 | 7)[];
                hours: Readonly<{} & {
                    end: string;
                    start: string;
                }>;
            }> | undefined;
        } & {}> | undefined;
        useAlertDataForTemplate?: boolean | undefined;
        params: {
            [x: string]: any;
        };
        actionRef: string;
        actionTypeId: string;
        uuid: string;
    }[];
    apiKey: string | null;
    updatedAt: string;
    params: {
        [x: string]: any;
    };
    tags: string[];
    alertTypeId: string;
    schedule: {
        interval: string;
    };
    consumer: string;
    legacyId: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    muteAll: boolean;
    mutedInstanceIds: string[];
    revision: number;
    executionStatus: {
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons;
        }> | null;
        warning: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons;
        }> | null;
        status: "error" | "warning" | "unknown" | "ok" | "active" | "pending";
        lastExecutionDate: string;
    };
    apiKeyOwner: string | null;
}>, context: import("@kbn/core-saved-objects-server").SavedObjectMigrationContext) => SavedObjectUnsanitizedDoc<{
    meta?: Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined;
    artifacts?: Readonly<{
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
        dashboards?: Readonly<{} & {
            refId: string;
        }>[] | undefined;
    } & {}> | undefined;
    mapped_params?: Readonly<{
        severity?: string | undefined;
        risk_score?: number | undefined;
    } & {}> | undefined;
    scheduledTaskId?: string | null | undefined;
    uiamApiKey?: string | null | undefined;
    throttle?: string | null | undefined;
    notifyWhen?: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange" | null | undefined;
    snoozedInstances?: Readonly<{
        snoozeSnapshot?: Record<string, any> | undefined;
        expiresAt?: string | undefined;
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            type: "severity_equals";
            value: "low" | "medium" | "high" | "info" | "critical";
        }>)[] | undefined;
        conditionOperator?: "all" | "any" | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined;
    monitoring?: Readonly<{} & {
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
    }> | undefined;
    snoozeSchedule?: Readonly<{
        id?: string | undefined;
        skipRecurrences?: string[] | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            freq?: 0 | 2 | 1 | 4 | 5 | 3 | 6 | undefined;
            until?: string | undefined;
            wkst?: "TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU" | undefined;
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
    }>[] | undefined;
    lastRun?: Readonly<{
        warning?: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons | import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons | null | undefined;
        outcomeOrder?: number | undefined;
        outcomeMsg?: string[] | null | undefined;
    } & {
        outcome: "warning" | "failed" | "succeeded";
        alertsCount: Readonly<{
            new?: number | null | undefined;
            active?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined;
    running?: boolean | null | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    apiKeyCreatedByUser?: boolean | null | undefined;
    isSnoozedUntil?: string | null | undefined;
    nextRun?: string | null | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    lastEnabledAt?: string | undefined;
    typeVersion?: number | undefined;
    name: string;
    enabled: boolean;
    actions: {
        group?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notifyWhen: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange";
        }> | undefined;
        alertsFilter?: Readonly<{
            query?: Readonly<{} & {
                filters: Readonly<{
                    query?: Record<string, any> | undefined;
                    $state?: Readonly<{} & {
                        store: import("@kbn/es-query-constants").FilterStateStore;
                    }> | undefined;
                } & {
                    meta: Readonly<{
                        type?: string | undefined;
                        index?: string | undefined;
                        key?: string | undefined;
                        value?: string | undefined;
                        disabled?: boolean | undefined;
                        group?: string | undefined;
                        field?: string | undefined;
                        params?: any;
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
                timezone: string;
                days: (2 | 1 | 4 | 5 | 3 | 6 | 7)[];
                hours: Readonly<{} & {
                    end: string;
                    start: string;
                }>;
            }> | undefined;
        } & {}> | undefined;
        useAlertDataForTemplate?: boolean | undefined;
        params: {
            [x: string]: any;
        };
        actionRef: string;
        actionTypeId: string;
        uuid: string;
    }[];
    apiKey: string | null;
    updatedAt: string;
    params: {
        [x: string]: any;
    };
    tags: string[];
    alertTypeId: string;
    schedule: {
        interval: string;
    };
    consumer: string;
    legacyId: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    muteAll: boolean;
    mutedInstanceIds: string[];
    revision: number;
    executionStatus: {
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons;
        }> | null;
        warning: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons;
        }> | null;
        status: "error" | "warning" | "unknown" | "ok" | "active" | "pending";
        lastExecutionDate: string;
    };
    apiKeyOwner: string | null;
}>;
