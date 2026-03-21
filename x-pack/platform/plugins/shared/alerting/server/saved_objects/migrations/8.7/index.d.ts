import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
export declare const getMigrations870: (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => (doc: SavedObjectUnsanitizedDoc<{
    meta?: Readonly<{
        versionApiKeyLastmodified?: string | undefined;
    } & {}> | undefined;
    monitoring?: Readonly<{} & {
        run: Readonly<{} & {
            history: Readonly<{
                duration?: number | undefined;
                outcome?: "warning" | "failed" | "succeeded" | undefined;
            } & {
                timestamp: number;
                success: boolean;
            }>[];
            calculated_metrics: Readonly<{
                p50?: number | undefined;
                p99?: number | undefined;
                p95?: number | undefined;
            } & {
                success_ratio: number;
            }>;
            last_run: Readonly<{} & {
                timestamp: string;
                metrics: Readonly<{
                    duration?: number | undefined;
                    total_indexing_duration_ms?: number | null | undefined;
                    total_search_duration_ms?: number | null | undefined;
                    gap_range?: Readonly<{} & {
                        gte: string;
                        lte: string;
                    }> | null | undefined;
                    total_alerts_detected?: number | null | undefined;
                    total_alerts_created?: number | null | undefined;
                    gap_duration_s?: number | null | undefined;
                } & {}>;
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
    uiamApiKey?: string | null | undefined;
    throttle?: string | null | undefined;
    notifyWhen?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
    snoozeSchedule?: Readonly<{
        id?: string | undefined;
        skipRecurrences?: string[] | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            wkst?: "TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            until?: string | undefined;
            freq?: 0 | 2 | 1 | 4 | 6 | 5 | 3 | undefined;
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
    apiKeyCreatedByUser?: boolean | null | undefined;
    isSnoozedUntil?: string | null | undefined;
    nextRun?: string | null | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    lastEnabledAt?: string | undefined;
    typeVersion?: number | undefined;
    enabled: boolean;
    name: string;
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
                        field?: string | undefined;
                        group?: string | undefined;
                        type?: string | undefined;
                        disabled?: boolean | undefined;
                        value?: string | undefined;
                        key?: string | undefined;
                        index?: string | undefined;
                        params?: any;
                        negate?: boolean | undefined;
                        alias?: string | null | undefined;
                        controlledBy?: string | undefined;
                        relation?: "AND" | "OR" | undefined;
                        isMultiIndex?: boolean | undefined;
                    } & {}>;
                }>[];
                kql: string;
                dsl: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                timezone: string;
                days: (2 | 1 | 4 | 6 | 5 | 3 | 7)[];
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
        uuid: string;
        actionTypeId: string;
        actionRef: string;
    }[];
    params: {
        [x: string]: any;
    };
    tags: string[];
    apiKey: string | null;
    muteAll: boolean;
    createdAt: string;
    schedule: {
        interval: string;
    };
    consumer: string;
    revision: number;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
    alertTypeId: string;
    legacyId: string | null;
    mutedInstanceIds: string[];
    executionStatus: {
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons;
        }> | null;
        status: "error" | "warning" | "pending" | "unknown" | "active" | "ok";
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
                timestamp: number;
                success: boolean;
            }>[];
            calculated_metrics: Readonly<{
                p50?: number | undefined;
                p99?: number | undefined;
                p95?: number | undefined;
            } & {
                success_ratio: number;
            }>;
            last_run: Readonly<{} & {
                timestamp: string;
                metrics: Readonly<{
                    duration?: number | undefined;
                    total_indexing_duration_ms?: number | null | undefined;
                    total_search_duration_ms?: number | null | undefined;
                    gap_range?: Readonly<{} & {
                        gte: string;
                        lte: string;
                    }> | null | undefined;
                    total_alerts_detected?: number | null | undefined;
                    total_alerts_created?: number | null | undefined;
                    gap_duration_s?: number | null | undefined;
                } & {}>;
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
    uiamApiKey?: string | null | undefined;
    throttle?: string | null | undefined;
    notifyWhen?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
    snoozeSchedule?: Readonly<{
        id?: string | undefined;
        skipRecurrences?: string[] | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            wkst?: "TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            until?: string | undefined;
            freq?: 0 | 2 | 1 | 4 | 6 | 5 | 3 | undefined;
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
    apiKeyCreatedByUser?: boolean | null | undefined;
    isSnoozedUntil?: string | null | undefined;
    nextRun?: string | null | undefined;
    alertDelay?: Readonly<{} & {
        active: number;
    }> | undefined;
    lastEnabledAt?: string | undefined;
    typeVersion?: number | undefined;
    enabled: boolean;
    name: string;
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
                        field?: string | undefined;
                        group?: string | undefined;
                        type?: string | undefined;
                        disabled?: boolean | undefined;
                        value?: string | undefined;
                        key?: string | undefined;
                        index?: string | undefined;
                        params?: any;
                        negate?: boolean | undefined;
                        alias?: string | null | undefined;
                        controlledBy?: string | undefined;
                        relation?: "AND" | "OR" | undefined;
                        isMultiIndex?: boolean | undefined;
                    } & {}>;
                }>[];
                kql: string;
                dsl: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                timezone: string;
                days: (2 | 1 | 4 | 6 | 5 | 3 | 7)[];
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
        uuid: string;
        actionTypeId: string;
        actionRef: string;
    }[];
    params: {
        [x: string]: any;
    };
    tags: string[];
    apiKey: string | null;
    muteAll: boolean;
    createdAt: string;
    schedule: {
        interval: string;
    };
    consumer: string;
    revision: number;
    updatedAt: string;
    createdBy: string | null;
    updatedBy: string | null;
    alertTypeId: string;
    legacyId: string | null;
    mutedInstanceIds: string[];
    executionStatus: {
        lastDuration?: number | undefined;
        error: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusErrorReasons;
        }> | null;
        status: "error" | "warning" | "pending" | "unknown" | "active" | "ok";
        warning: Readonly<{} & {
            message: string;
            reason: import("@kbn/alerting-types/rule_types").RuleExecutionStatusWarningReasons;
        }> | null;
        lastExecutionDate: string;
    };
    apiKeyOwner: string | null;
}>;
