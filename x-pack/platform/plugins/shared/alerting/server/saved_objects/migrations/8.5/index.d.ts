import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const getMigrations850: (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => (doc: SavedObjectUnsanitizedDoc<{
    name: string;
    enabled: boolean;
    consumer: string;
    tags: string[];
    alertTypeId: string;
    apiKeyOwner: string | null;
    apiKey: string | null;
    apiKeyCreatedByUser?: boolean | null | undefined;
    createdBy: string | null;
    updatedBy: string | null;
    updatedAt: string;
    createdAt: string;
    muteAll: boolean;
    mutedInstanceIds: string[];
    throttle?: string | null | undefined;
    revision: number;
    running?: boolean | null | undefined;
    schedule: {
        interval: string;
    };
    legacyId: string | null;
    scheduledTaskId?: string | null | undefined;
    isSnoozedUntil?: string | null | undefined;
    snoozeSchedule?: Readonly<{
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
    }>[] | undefined;
    meta?: Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined;
    actions: {
        uuid: string;
        group?: string | undefined;
        actionRef: string;
        actionTypeId: string;
        params: {
            [x: string]: any;
        };
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
                        store: import("@kbn/es-query-constants").FilterStateStore;
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
    }[];
    executionStatus: {
        status: "active" | "error" | "ok" | "pending" | "unknown" | "warning";
        lastExecutionDate: string;
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            reason: import("@kbn/alerting-types").RuleExecutionStatusErrorReasons;
            message: string;
        }> | null;
        warning: Readonly<{} & {
            reason: import("@kbn/alerting-types").RuleExecutionStatusWarningReasons;
            message: string;
        }> | null;
    };
    notifyWhen?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
    lastRun?: Readonly<{
        outcomeOrder?: number | undefined;
        outcomeMsg?: string[] | null | undefined;
        warning?: import("@kbn/alerting-types").RuleExecutionStatusErrorReasons | import("@kbn/alerting-types").RuleExecutionStatusWarningReasons | null | undefined;
    } & {
        outcome: "failed" | "succeeded" | "warning";
        alertsCount: Readonly<{
            new?: number | null | undefined;
            active?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined;
    nextRun?: string | null | undefined;
    mapped_params?: Readonly<{
        risk_score?: number | undefined;
        severity?: string | undefined;
    } & {}> | undefined;
    params: {
        [x: string]: any;
    };
    typeVersion?: number | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    artifacts?: Readonly<{
        dashboards?: Readonly<{} & {
            refId: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    uiamApiKey?: string | null | undefined;
    lastEnabledAt?: string | undefined;
    monitoring?: Readonly<{} & {
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
    }> | undefined;
    snoozedInstances?: Readonly<{
        expiresAt?: string | undefined;
        conditionOperator?: "all" | "any" | undefined;
        snoozeSnapshot?: Record<string, any> | undefined;
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            type: "severity_equals";
            value: "critical" | "high" | "info" | "low" | "major" | "medium" | "minor" | "warning";
        }>)[] | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined;
    uiamApiKeyExternal?: boolean | null | undefined;
    createdByProfileUid?: string | null | undefined;
    updatedByProfileUid?: string | null | undefined;
    apiKeyOwnerProfileUid?: string | null | undefined;
}>, context: SavedObjectMigrationContext) => SavedObjectUnsanitizedDoc<{
    name: string;
    enabled: boolean;
    consumer: string;
    tags: string[];
    alertTypeId: string;
    apiKeyOwner: string | null;
    apiKey: string | null;
    apiKeyCreatedByUser?: boolean | null | undefined;
    createdBy: string | null;
    updatedBy: string | null;
    updatedAt: string;
    createdAt: string;
    muteAll: boolean;
    mutedInstanceIds: string[];
    throttle?: string | null | undefined;
    revision: number;
    running?: boolean | null | undefined;
    schedule: {
        interval: string;
    };
    legacyId: string | null;
    scheduledTaskId?: string | null | undefined;
    isSnoozedUntil?: string | null | undefined;
    snoozeSchedule?: Readonly<{
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
    }>[] | undefined;
    meta?: Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined;
    actions: {
        uuid: string;
        group?: string | undefined;
        actionRef: string;
        actionTypeId: string;
        params: {
            [x: string]: any;
        };
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
                        store: import("@kbn/es-query-constants").FilterStateStore;
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
    }[];
    executionStatus: {
        status: "active" | "error" | "ok" | "pending" | "unknown" | "warning";
        lastExecutionDate: string;
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            reason: import("@kbn/alerting-types").RuleExecutionStatusErrorReasons;
            message: string;
        }> | null;
        warning: Readonly<{} & {
            reason: import("@kbn/alerting-types").RuleExecutionStatusWarningReasons;
            message: string;
        }> | null;
    };
    notifyWhen?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
    lastRun?: Readonly<{
        outcomeOrder?: number | undefined;
        outcomeMsg?: string[] | null | undefined;
        warning?: import("@kbn/alerting-types").RuleExecutionStatusErrorReasons | import("@kbn/alerting-types").RuleExecutionStatusWarningReasons | null | undefined;
    } & {
        outcome: "failed" | "succeeded" | "warning";
        alertsCount: Readonly<{
            new?: number | null | undefined;
            active?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined;
    nextRun?: string | null | undefined;
    mapped_params?: Readonly<{
        risk_score?: number | undefined;
        severity?: string | undefined;
    } & {}> | undefined;
    params: {
        [x: string]: any;
    };
    typeVersion?: number | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    artifacts?: Readonly<{
        dashboards?: Readonly<{} & {
            refId: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined;
    uiamApiKey?: string | null | undefined;
    lastEnabledAt?: string | undefined;
    monitoring?: Readonly<{} & {
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
    }> | undefined;
    snoozedInstances?: Readonly<{
        expiresAt?: string | undefined;
        conditionOperator?: "all" | "any" | undefined;
        snoozeSnapshot?: Record<string, any> | undefined;
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            type: "severity_equals";
            value: "critical" | "high" | "info" | "low" | "major" | "medium" | "minor" | "warning";
        }>)[] | undefined;
    } & {
        instanceId: string;
        snoozedAt: string;
        snoozedBy: string;
    }>[] | undefined;
    uiamApiKeyExternal?: boolean | null | undefined;
    createdByProfileUid?: string | null | undefined;
    updatedByProfileUid?: string | null | undefined;
    apiKeyOwnerProfileUid?: string | null | undefined;
}>;
