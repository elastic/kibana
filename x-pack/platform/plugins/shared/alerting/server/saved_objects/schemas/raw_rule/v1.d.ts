export declare const alertDelaySchema: import("@kbn/config-schema").ObjectType<{
    active: import("@kbn/config-schema").Type<number>;
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
            wkst?: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number | undefined;
            bymonth?: number | undefined;
            bysetpos?: number | undefined;
            bymonthday?: number | undefined;
            byweekday?: (string | number)[] | undefined;
            byhour?: number | undefined;
            byminute?: number | undefined;
            bysecond?: number | undefined;
            freq?: 0 | 1 | 2 | 3 | 5 | 4 | 6 | undefined;
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
            notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
            throttle: string | null;
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
                        value?: string | undefined;
                        type?: string | undefined;
                        index?: string | undefined;
                        params?: any;
                        key?: string | undefined;
                        alias?: string | null | undefined;
                        disabled?: boolean | undefined;
                        negate?: boolean | undefined;
                        controlledBy?: string | undefined;
                        group?: string | undefined;
                        isMultiIndex?: boolean | undefined;
                        field?: string | undefined;
                        relation?: "AND" | "OR" | undefined;
                    } & {}>;
                }>[];
                kql: string;
            }> | undefined;
            timeframe?: Readonly<{} & {
                timezone: string;
                days: (1 | 2 | 3 | 5 | 4 | 6 | 7)[];
                hours: Readonly<{} & {
                    start: string;
                    end: string;
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
        status: import("@kbn/config-schema").Type<"error" | "warning" | "unknown" | "ok" | "active" | "pending">;
        lastExecutionDate: import("@kbn/config-schema").Type<string>;
        lastDuration: import("@kbn/config-schema").Type<number | undefined>;
        error: import("@kbn/config-schema").Type<Readonly<{} & {
            message: string;
            reason: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt";
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
                success: boolean;
                timestamp: number;
            }>[];
            calculated_metrics: Readonly<{
                p99?: number | undefined;
                p95?: number | undefined;
                p50?: number | undefined;
            } & {
                success_ratio: number;
            }>;
            last_run: Readonly<{} & {
                metrics: Readonly<{
                    duration?: number | undefined;
                    total_search_duration_ms?: number | null | undefined;
                    total_indexing_duration_ms?: number | null | undefined;
                    total_alerts_detected?: number | null | undefined;
                    total_alerts_created?: number | null | undefined;
                    gap_duration_s?: number | null | undefined;
                } & {}>;
                timestamp: string;
            }>;
        }>;
    }> | undefined>;
    lastRun: import("@kbn/config-schema").Type<Readonly<{
        warning?: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined;
        outcomeOrder?: number | undefined;
        outcomeMsg?: string[] | null | undefined;
    } & {
        outcome: "warning" | "failed" | "succeeded";
        alertsCount: Readonly<{
            new?: number | null | undefined;
            active?: number | null | undefined;
            ignored?: number | null | undefined;
            recovered?: number | null | undefined;
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
}>;
