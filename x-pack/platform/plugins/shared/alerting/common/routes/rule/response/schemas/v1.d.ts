import type { Type } from '@kbn/config-schema';
import { type AlertSeverity } from '@kbn/rule-data-utils';
export declare const actionParamsSchema: Type<Record<string, any>>;
export declare const mappedParamsSchema: Type<Record<string, any>>;
export declare const notifyWhenSchema: Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval">;
export declare const ruleExecutionStatusSchema: import("@kbn/config-schema").ObjectType<{
    status: Type<"error" | "warning" | "unknown" | "ok" | "active" | "pending">;
    last_execution_date: Type<string>;
    last_duration: Type<number | undefined>;
    error: Type<Readonly<{} & {
        message: string;
        reason: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt";
    }> | undefined>;
    warning: Type<Readonly<{} & {
        message: string;
        reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
    }> | undefined>;
}>;
export declare const outcome: Type<"warning" | "failed" | "succeeded">;
export declare const ruleLastRunSchema: import("@kbn/config-schema").ObjectType<{
    outcome: Type<"warning" | "failed" | "succeeded">;
    outcome_order: Type<number | undefined>;
    warning: Type<"disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined>;
    outcome_msg: Type<string[] | null | undefined>;
    alerts_count: import("@kbn/config-schema").ObjectType<{
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
            outcome?: "warning" | "failed" | "succeeded" | undefined;
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
            }>;
        }>;
    }>;
}>;
export declare const ruleSnoozeScheduleSchema: import("@kbn/config-schema").ObjectType<{
    id: Type<string | undefined>;
    duration: Type<number>;
    rRule: import("@kbn/config-schema").ObjectType<{
        dtstart: Type<string>;
        tzid: Type<string>;
        freq: Type<0 | 1 | 2 | 3 | 5 | 4 | 6 | undefined>;
        until: Type<string | undefined>;
        count: Type<number | undefined>;
        interval: Type<number | undefined>;
        wkst: Type<"MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined>;
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
    skipRecurrences: Type<string[] | undefined>;
}>;
export declare const alertDelaySchema: import("@kbn/config-schema").ObjectType<{
    active: Type<number>;
}>;
export declare const dashboardsSchema: Type<Readonly<{} & {
    id: string;
}>[]>;
export declare const investigationGuideSchema: import("@kbn/config-schema").ObjectType<{
    blob: Type<string>;
}>;
export declare const artifactsSchema: import("@kbn/config-schema").ObjectType<{
    dashboards: Type<Readonly<{} & {
        id: string;
    }>[] | undefined>;
    investigation_guide: Type<Readonly<{} & {
        blob: string;
    }> | undefined>;
}>;
export declare const snoozedAlertInstanceSchema: import("@kbn/config-schema").ObjectType<{
    instance_id: Type<string>;
    expires_at: Type<string | undefined>;
    conditions: Type<(Readonly<{} & {
        type: "field_change";
        field: string;
    }> | Readonly<{} & {
        type: "severity_change";
    }> | Readonly<{} & {
        value: AlertSeverity;
        type: "severity_equals";
    }>)[] | undefined>;
    condition_operator: Type<"all" | "any" | undefined>;
    snoozed_at: Type<string>;
    snoozed_by: Type<string>;
}>;
/**
 * This is a public schema that is used to generate the OpenAPI schema for all of our public APIs that return a rule response.
 */
export declare const ruleResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: Type<string>;
    enabled: Type<boolean>;
    name: Type<string>;
    tags: Type<string[]>;
    rule_type_id: Type<string>;
    consumer: Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: Type<string>;
    }>;
    actions: Type<Readonly<{
        group?: string | undefined;
        uuid?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notify_when: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        }> | undefined;
        alerts_filter?: Readonly<{
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
                timezone: string;
                days: (1 | 2 | 3 | 5 | 4 | 6 | 7)[];
                hours: Readonly<{} & {
                    start: string;
                    end: string;
                }>;
            }> | undefined;
        } & {}> | undefined;
        use_alert_data_for_template?: boolean | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        connector_type_id: string;
    }>[]>;
    params: Type<Record<string, any>>;
    mapped_params: Type<Record<string, any> | undefined>;
    scheduled_task_id: Type<string | undefined>;
    created_by: Type<string | null>;
    updated_by: Type<string | null>;
    created_at: Type<string>;
    updated_at: Type<string>;
    api_key_owner: Type<string | null>;
    api_key_created_by_user: Type<boolean | null | undefined>;
    throttle: Type<string | null | undefined>;
    mute_all: Type<boolean>;
    notify_when: Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    muted_alert_ids: Type<string[]>;
    execution_status: import("@kbn/config-schema").ObjectType<{
        status: Type<"error" | "warning" | "unknown" | "ok" | "active" | "pending">;
        last_execution_date: Type<string>;
        last_duration: Type<number | undefined>;
        error: Type<Readonly<{} & {
            message: string;
            reason: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt";
        }> | undefined>;
        warning: Type<Readonly<{} & {
            message: string;
            reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
        }> | undefined>;
    }>;
    last_run: Type<Readonly<{
        warning?: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined;
        outcome_msg?: string[] | null | undefined;
        outcome_order?: number | undefined;
    } & {
        outcome: "warning" | "failed" | "succeeded";
        alerts_count: Readonly<{
            new?: number | null | undefined;
            active?: number | null | undefined;
            ignored?: number | null | undefined;
            recovered?: number | null | undefined;
        } & {}>;
    }> | null | undefined>;
    next_run: Type<string | null | undefined>;
    revision: Type<number>;
    running: Type<boolean | null | undefined>;
    alert_delay: Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    flapping: Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        look_back_window: number;
        status_change_threshold: number;
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
 * This is an internal schema that is used for all of our internal APIs that return a rule response.
 */
export declare const ruleResponseInternalSchema: import("@kbn/config-schema").ObjectType<{
    id: Type<string>;
    enabled: Type<boolean>;
    name: Type<string>;
    tags: Type<string[]>;
    rule_type_id: Type<string>;
    consumer: Type<string>;
    schedule: import("@kbn/config-schema").ObjectType<{
        interval: Type<string>;
    }>;
    actions: Type<Readonly<{
        group?: string | undefined;
        uuid?: string | undefined;
        frequency?: Readonly<{} & {
            summary: boolean;
            throttle: string | null;
            notify_when: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        }> | undefined;
        alerts_filter?: Readonly<{
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
                timezone: string;
                days: (1 | 2 | 3 | 5 | 4 | 6 | 7)[];
                hours: Readonly<{} & {
                    start: string;
                    end: string;
                }>;
            }> | undefined;
        } & {}> | undefined;
        use_alert_data_for_template?: boolean | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        connector_type_id: string;
    }>[]>;
    params: Type<Record<string, any>>;
    mapped_params: Type<Record<string, any> | undefined>;
    scheduled_task_id: Type<string | undefined>;
    created_by: Type<string | null>;
    updated_by: Type<string | null>;
    created_at: Type<string>;
    updated_at: Type<string>;
    api_key_owner: Type<string | null>;
    api_key_created_by_user: Type<boolean | null | undefined>;
    throttle: Type<string | null | undefined>;
    mute_all: Type<boolean>;
    notify_when: Type<"onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined>;
    muted_alert_ids: Type<string[]>;
    execution_status: import("@kbn/config-schema").ObjectType<{
        status: Type<"error" | "warning" | "unknown" | "ok" | "active" | "pending">;
        last_execution_date: Type<string>;
        last_duration: Type<number | undefined>;
        error: Type<Readonly<{} & {
            message: string;
            reason: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt";
        }> | undefined>;
        warning: Type<Readonly<{} & {
            message: string;
            reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
        }> | undefined>;
    }>;
    monitoring: Type<Readonly<{} & {
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
                    gap_range?: Readonly<{} & {
                        gte: string;
                        lte: string;
                    }> | null | undefined;
                } & {}>;
                timestamp: string;
            }>;
        }>;
    }> | undefined>;
    snooze_schedule: Type<Readonly<{
        id?: string | undefined;
        skipRecurrences?: string[] | undefined;
    } & {
        duration: number;
        rRule: Readonly<{
            count?: number | undefined;
            interval?: number | undefined;
            until?: string | undefined;
            wkst?: "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU" | undefined;
            byyearday?: number[] | null | undefined;
            bymonth?: number[] | null | undefined;
            bysetpos?: number[] | null | undefined;
            bymonthday?: number[] | null | undefined;
            byweekday?: (string | number)[] | null | undefined;
            byhour?: number[] | null | undefined;
            byminute?: number[] | null | undefined;
            bysecond?: number[] | null | undefined;
            freq?: 0 | 1 | 2 | 3 | 5 | 4 | 6 | undefined;
            byweekno?: number[] | null | undefined;
        } & {
            dtstart: string;
            tzid: string;
        }>;
    }>[] | undefined>;
    active_snoozes: Type<string[] | undefined>;
    snoozed_alert_instances: Type<Readonly<{
        conditions?: (Readonly<{} & {
            type: "field_change";
            field: string;
        }> | Readonly<{} & {
            type: "severity_change";
        }> | Readonly<{} & {
            value: AlertSeverity;
            type: "severity_equals";
        }>)[] | undefined;
        expires_at?: string | undefined;
        condition_operator?: "all" | "any" | undefined;
    } & {
        instance_id: string;
        snoozed_at: string;
        snoozed_by: string;
    }>[] | undefined>;
    is_snoozed_until: Type<string | null | undefined>;
    last_run: Type<Readonly<{
        warning?: "disabled" | "execute" | "unknown" | "read" | "timeout" | "license" | "validate" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined;
        outcome_msg?: string[] | null | undefined;
        outcome_order?: number | undefined;
    } & {
        outcome: "warning" | "failed" | "succeeded";
        alerts_count: Readonly<{
            new?: number | null | undefined;
            active?: number | null | undefined;
            ignored?: number | null | undefined;
            recovered?: number | null | undefined;
        } & {}>;
    }> | null | undefined>;
    next_run: Type<string | null | undefined>;
    revision: Type<number>;
    running: Type<boolean | null | undefined>;
    view_in_app_relative_url: Type<string | null | undefined>;
    alert_delay: Type<Readonly<{} & {
        active: number;
    }> | undefined>;
    flapping: Type<Readonly<{
        enabled?: boolean | undefined;
    } & {
        look_back_window: number;
        status_change_threshold: number;
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
export declare const scheduleIdsSchema: Type<string[] | undefined>;
