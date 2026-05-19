import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const getMigrations7130: (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => (doc: SavedObjectUnsanitizedDoc<{
    meta?: Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined;
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
    artifacts?: Readonly<{
        dashboards?: Readonly<{} & {
            refId: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined;
    running?: boolean | null | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    uiamApiKey?: string | null | undefined;
    apiKeyCreatedByUser?: boolean | null | undefined;
    mapped_params?: Readonly<{
        severity?: string | undefined;
        risk_score?: number | undefined;
    } & {}> | undefined;
    scheduledTaskId?: string | null | undefined;
    throttle?: string | null | undefined;
    notifyWhen?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
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
            value: "info" | "critical" | "medium" | "high" | "low";
        }>)[] | undefined;
        conditionOperator?: "all" | "any" | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined;
    snoozeSchedule?: Readonly<{
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
    }>[] | undefined;
    lastRun?: Readonly<{
        warning?: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons | import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons | null | undefined;
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
    }> | null | undefined;
    isSnoozedUntil?: string | null | undefined;
    nextRun?: string | null | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    lastEnabledAt?: string | undefined;
    typeVersion?: number | undefined;
    tags: string[];
    name: string;
    params: {
        [x: string]: any;
    };
    enabled: boolean;
    apiKey: string | null;
    actions: {
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
                        store: import("@kbn/es-query-constants").FilterStateStore;
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
        params: {
            [x: string]: any;
        };
        uuid: string;
        actionRef: string;
        actionTypeId: string;
    }[];
    createdBy: string | null;
    updatedAt: string;
    schedule: {
        interval: string;
    };
    createdAt: string;
    muteAll: boolean;
    alertTypeId: string;
    consumer: string;
    legacyId: string | null;
    updatedBy: string | null;
    mutedInstanceIds: string[];
    revision: number;
    executionStatus: {
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons;
        }> | null;
        status: "error" | "pending" | "active" | "warning" | "unknown" | "ok";
        warning: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons;
        }> | null;
        lastExecutionDate: string;
    };
    apiKeyOwner: string | null;
}>, context: import("@kbn/core-saved-objects-server").SavedObjectMigrationContext) => SavedObjectUnsanitizedDoc<{
    meta?: Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined;
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
    artifacts?: Readonly<{
        dashboards?: Readonly<{} & {
            refId: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined;
    running?: boolean | null | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    uiamApiKey?: string | null | undefined;
    apiKeyCreatedByUser?: boolean | null | undefined;
    mapped_params?: Readonly<{
        severity?: string | undefined;
        risk_score?: number | undefined;
    } & {}> | undefined;
    scheduledTaskId?: string | null | undefined;
    throttle?: string | null | undefined;
    notifyWhen?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
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
            value: "info" | "critical" | "medium" | "high" | "low";
        }>)[] | undefined;
        conditionOperator?: "all" | "any" | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined;
    snoozeSchedule?: Readonly<{
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
    }>[] | undefined;
    lastRun?: Readonly<{
        warning?: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons | import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons | null | undefined;
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
    }> | null | undefined;
    isSnoozedUntil?: string | null | undefined;
    nextRun?: string | null | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    lastEnabledAt?: string | undefined;
    typeVersion?: number | undefined;
    tags: string[];
    name: string;
    params: {
        [x: string]: any;
    };
    enabled: boolean;
    apiKey: string | null;
    actions: {
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
                        store: import("@kbn/es-query-constants").FilterStateStore;
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
        params: {
            [x: string]: any;
        };
        uuid: string;
        actionRef: string;
        actionTypeId: string;
    }[];
    createdBy: string | null;
    updatedAt: string;
    schedule: {
        interval: string;
    };
    createdAt: string;
    muteAll: boolean;
    alertTypeId: string;
    consumer: string;
    legacyId: string | null;
    updatedBy: string | null;
    mutedInstanceIds: string[];
    revision: number;
    executionStatus: {
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons;
        }> | null;
        status: "error" | "pending" | "active" | "warning" | "unknown" | "ok";
        warning: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons;
        }> | null;
        lastExecutionDate: string;
    };
    apiKeyOwner: string | null;
}>;
