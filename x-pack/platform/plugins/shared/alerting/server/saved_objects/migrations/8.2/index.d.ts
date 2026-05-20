import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const getMigrations820: (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => (doc: SavedObjectUnsanitizedDoc<{
    meta?: Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined;
    monitoring?: Readonly<{} & {
        run: Readonly<{} & {
            history: Readonly<{
                duration?: number | undefined;
                outcome?: "warning" | "succeeded" | "failed" | undefined;
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
                metrics: Readonly<{
                    duration?: number | undefined;
                    total_indexing_duration_ms?: number | null | undefined;
                    total_search_duration_ms?: number | null | undefined;
                    gap_range?: Readonly<{} & {
                        gte: string;
                        lte: string;
                    }> | null | undefined;
                    gap_reason?: Readonly<{} & {
                        type: string;
                    }> | null | undefined;
                    total_alerts_detected?: number | null | undefined;
                    total_alerts_created?: number | null | undefined;
                    gap_duration_s?: number | null | undefined;
                } & {}>;
                timestamp: string;
            }>;
        }>;
    }> | undefined;
    running?: boolean | null | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    uiamApiKey?: string | null | undefined;
    apiKeyCreatedByUser?: boolean | null | undefined;
    throttle?: string | null | undefined;
    artifacts?: Readonly<{
        dashboards?: Readonly<{} & {
            refId: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined;
    mapped_params?: Readonly<{
        severity?: string | undefined;
        risk_score?: number | undefined;
    } & {}> | undefined;
    scheduledTaskId?: string | null | undefined;
    notifyWhen?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
    snoozedInstances?: Readonly<{
        expiresAt?: string | undefined;
        snoozeSnapshot?: Record<string, any> | undefined;
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
    snoozeSchedule?: Readonly<{
        id?: string | undefined;
        skipRecurrences?: string[] | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            wkst?: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            freq?: 0 | 2 | 1 | 4 | 5 | 3 | 6 | undefined;
            until?: string | undefined;
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
        outcome: "warning" | "succeeded" | "failed";
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
    name: string;
    tags: string[];
    params: {
        [x: string]: any;
    };
    enabled: boolean;
    updatedAt: string;
    schedule: {
        interval: string;
    };
    createdAt: string;
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
                        type?: string | undefined;
                        index?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        value?: string | undefined;
                        params?: any;
                        disabled?: boolean | undefined;
                        group?: string | undefined;
                        alias?: string | null | undefined;
                        negate?: boolean | undefined;
                        relation?: "AND" | "OR" | undefined;
                        controlledBy?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                    } & {}>;
                }>[];
                kql: string;
                dsl: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                hours: Readonly<{} & {
                    start: string;
                    end: string;
                }>;
                days: (2 | 1 | 4 | 5 | 3 | 7 | 6)[];
                timezone: string;
            }> | undefined;
        } & {}> | undefined;
        useAlertDataForTemplate?: boolean | undefined;
        params: {
            [x: string]: any;
        };
        uuid: string;
        actionTypeId: string;
        actionRef: string;
    }[];
    apiKey: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    muteAll: boolean;
    consumer: string;
    revision: number;
    alertTypeId: string;
    legacyId: string | null;
    mutedInstanceIds: string[];
    executionStatus: {
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons;
        }> | null;
        status: "error" | "warning" | "active" | "ok" | "unknown" | "pending";
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
                outcome?: "warning" | "succeeded" | "failed" | undefined;
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
                metrics: Readonly<{
                    duration?: number | undefined;
                    total_indexing_duration_ms?: number | null | undefined;
                    total_search_duration_ms?: number | null | undefined;
                    gap_range?: Readonly<{} & {
                        gte: string;
                        lte: string;
                    }> | null | undefined;
                    gap_reason?: Readonly<{} & {
                        type: string;
                    }> | null | undefined;
                    total_alerts_detected?: number | null | undefined;
                    total_alerts_created?: number | null | undefined;
                    gap_duration_s?: number | null | undefined;
                } & {}>;
                timestamp: string;
            }>;
        }>;
    }> | undefined;
    running?: boolean | null | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    uiamApiKey?: string | null | undefined;
    apiKeyCreatedByUser?: boolean | null | undefined;
    throttle?: string | null | undefined;
    artifacts?: Readonly<{
        dashboards?: Readonly<{} & {
            refId: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined;
    mapped_params?: Readonly<{
        severity?: string | undefined;
        risk_score?: number | undefined;
    } & {}> | undefined;
    scheduledTaskId?: string | null | undefined;
    notifyWhen?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
    snoozedInstances?: Readonly<{
        expiresAt?: string | undefined;
        snoozeSnapshot?: Record<string, any> | undefined;
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
    snoozeSchedule?: Readonly<{
        id?: string | undefined;
        skipRecurrences?: string[] | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            wkst?: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            freq?: 0 | 2 | 1 | 4 | 5 | 3 | 6 | undefined;
            until?: string | undefined;
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
        outcome: "warning" | "succeeded" | "failed";
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
    name: string;
    tags: string[];
    params: {
        [x: string]: any;
    };
    enabled: boolean;
    updatedAt: string;
    schedule: {
        interval: string;
    };
    createdAt: string;
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
                        type?: string | undefined;
                        index?: string | undefined;
                        key?: string | undefined;
                        field?: string | undefined;
                        value?: string | undefined;
                        params?: any;
                        disabled?: boolean | undefined;
                        group?: string | undefined;
                        alias?: string | null | undefined;
                        negate?: boolean | undefined;
                        relation?: "AND" | "OR" | undefined;
                        controlledBy?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                    } & {}>;
                }>[];
                kql: string;
                dsl: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                hours: Readonly<{} & {
                    start: string;
                    end: string;
                }>;
                days: (2 | 1 | 4 | 5 | 3 | 7 | 6)[];
                timezone: string;
            }> | undefined;
        } & {}> | undefined;
        useAlertDataForTemplate?: boolean | undefined;
        params: {
            [x: string]: any;
        };
        uuid: string;
        actionTypeId: string;
        actionRef: string;
    }[];
    apiKey: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    muteAll: boolean;
    consumer: string;
    revision: number;
    alertTypeId: string;
    legacyId: string | null;
    mutedInstanceIds: string[];
    executionStatus: {
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons;
        }> | null;
        status: "error" | "warning" | "active" | "ok" | "unknown" | "pending";
        warning: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons;
        }> | null;
        lastExecutionDate: string;
    };
    apiKeyOwner: string | null;
}>;
