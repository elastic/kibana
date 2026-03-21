export * from './v1';
export declare const flappingSchema: import("@kbn/config-schema").ObjectType<{
    lookBackWindow: import("@kbn/config-schema").Type<number>;
    statusChangeThreshold: import("@kbn/config-schema").Type<number>;
}>;
export declare const rawRuleSchema: import("@kbn/config-schema").ObjectType<Omit<{
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
            wkst?: "TH" | "MO" | "TU" | "WE" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number | undefined;
            bymonth?: number | undefined;
            bysetpos?: number | undefined;
            bymonthday?: number | undefined;
            byweekday?: (string | number)[] | undefined;
            byhour?: number | undefined;
            byminute?: number | undefined;
            bysecond?: number | undefined;
            until?: string | undefined;
            freq?: 0 | 2 | 1 | 4 | 6 | 5 | 3 | undefined;
            byweekno?: number | undefined;
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
                        store: "appState" | "globalState";
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
    } & {
        params: Record<string, any>;
        actionTypeId: string;
        actionRef: string;
    }>[]>;
    executionStatus: import("@kbn/config-schema").ObjectType<{
        status: import("@kbn/config-schema").Type<"error" | "warning" | "pending" | "unknown" | "active" | "ok">;
        lastExecutionDate: import("@kbn/config-schema").Type<string>;
        lastDuration: import("@kbn/config-schema").Type<number | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "execute" | "disabled" | "validate" | "unknown" | "license" | "timeout" | "read" | "decrypt";
        }> | null>;
        warning: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
        }> | null>;
    }>;
    notifyWhen: import("@kbn/config-schema").Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    monitoring: import("@kbn/config-schema").Type<Readonly<{} & {
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
                    total_alerts_detected?: number | null | undefined;
                    total_alerts_created?: number | null | undefined;
                    gap_duration_s?: number | null | undefined;
                } & {}>;
            }>;
        }>;
    }> | undefined>;
    lastRun: import("@kbn/config-schema").Type<Readonly<{
        warning?: "execute" | "disabled" | "validate" | "unknown" | "license" | "timeout" | "read" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined;
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
}, "flapping"> & {
    flapping: import("@kbn/config-schema").Type<Readonly<{} & {
        lookBackWindow: number;
        statusChangeThreshold: number;
    }> | null | undefined>;
}>;
