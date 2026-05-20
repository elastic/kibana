import type { ResolvedRule } from '../../../../../../application/rule/methods/resolve/types';
import type { RuleParams } from '../../../../../../application/rule/types';
export declare const transformResolveResponse: <Params extends RuleParams = never>(rule: ResolvedRule<Params>) => {
    artifacts?: Readonly<{
        dashboards?: Readonly<{} & {
            id: string;
        }>[] | undefined;
        investigation_guide?: Readonly<{} & {
            blob: string;
        }> | undefined;
    } & {}> | undefined;
    outcome: string;
    alias_target_id: string | undefined;
    id: string;
    enabled: boolean;
    name: string;
    tags: string[];
    rule_type_id: string;
    consumer: string;
    schedule: Readonly<{} & {
        interval: string;
    }>;
    actions: Readonly<{
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
                hours: Readonly<{} & {
                    start: string;
                    end: string;
                }>;
                days: (2 | 1 | 4 | 5 | 3 | 7 | 6)[];
                timezone: string;
            }> | undefined;
        } & {}> | undefined;
        use_alert_data_for_template?: boolean | undefined;
    } & {
        id: string;
        params: Record<string, any>;
        connector_type_id: string;
    }>[];
    params: Record<string, any>;
    mapped_params?: Record<string, any> | undefined;
    scheduled_task_id?: string | undefined;
    created_by: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
    api_key_owner: string | null;
    api_key_created_by_user?: boolean | null | undefined;
    throttle?: string | null | undefined;
    mute_all: boolean;
    notify_when?: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval" | null | undefined;
    muted_alert_ids: string[];
    execution_status?: Readonly<{
        error?: Readonly<{} & {
            message: string;
            reason: "license" | "unknown" | "timeout" | "validate" | "disabled" | "execute" | "read" | "decrypt";
        }> | undefined;
        warning?: Readonly<{} & {
            message: string;
            reason: "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution";
        }> | undefined;
        last_duration?: number | undefined;
    } & {
        status: "error" | "warning" | "active" | "ok" | "unknown" | "pending";
        last_execution_date: string;
    }>;
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
                    total_alerts_detected?: number | null | undefined;
                    total_alerts_created?: number | null | undefined;
                    gap_duration_s?: number | null | undefined;
                } & {}>;
                timestamp: string;
            }>;
        }>;
    }> | undefined;
    snooze_schedule?: Readonly<{
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
    active_snoozes?: string[] | undefined;
    is_snoozed_until?: string | null | undefined;
    last_run?: Readonly<{
        warning?: "license" | "unknown" | "timeout" | "validate" | "disabled" | "execute" | "read" | "decrypt" | "maxExecutableActions" | "maxAlerts" | "maxQueuedActions" | "ruleExecution" | null | undefined;
        outcome_order?: number | undefined;
        outcome_msg?: string[] | null | undefined;
    } & {
        outcome: "warning" | "succeeded" | "failed";
        alerts_count: Readonly<{
            active?: number | null | undefined;
            new?: number | null | undefined;
            recovered?: number | null | undefined;
            ignored?: number | null | undefined;
        } & {}>;
    }> | null | undefined;
    next_run?: string | null | undefined;
    revision: number;
    running?: boolean | null | undefined;
    view_in_app_relative_url?: string | null | undefined;
    alert_delay?: Readonly<{} & {
        active: number;
    }> | undefined;
    flapping?: Readonly<{
        enabled?: boolean | undefined;
    } & {
        look_back_window: number;
        status_change_threshold: number;
    }> | null | undefined;
};
